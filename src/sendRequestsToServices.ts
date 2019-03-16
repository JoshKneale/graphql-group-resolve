// import util from 'util';
import axios from 'axios';
import Store from './store';
import { resolverMap } from './resolverDeets';
import { jsonToGraphQLQuery } from 'json-to-graphql-query';

const asyncForEach = async (array: any[], callback: any) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

export const getPrimaryKey = (store: Store, resolver: string): string => {
  // TODO: check if primary key exists (store the schema on startup and reference it)
  const parent = store.requestGroup[resolver].parent;
  if (parent) {
    // if resolver has a parent - return parents name + 'Id'
    return (resolverMap[parent].returnType === 'array' ? parent.substring(0, parent.length - 1) : parent) + 'Id';
  } else {
    // otherwise return default primary
    return 'id';
  }
};

export default async (store: Store): Promise<void> => {
  /**
   * Create a query object for a resolver
   */
  const createResolverQuery = (resolver: string): object => {
    const parentResolver = store.requestGroup[resolver].parent;

    const res: {
      [key: string]: any;
    } = {};

    // add fields
    store.requestGroup[resolver].fields.forEach((field: string) => {
      res[field] = true;
    });

    // if arguments are provided - add to the resolver
    if (Object.keys(store.requestGroup[resolver].arguments).length) {
      res.__args = {};
      Object.keys(store.requestGroup[resolver].arguments).forEach((key: string) => {
        res.__args[key] = store.requestGroup[resolver].arguments[key];
      });
    }

    // add primary key for all requests
    res[getPrimaryKey(store, resolver)] = true;

    // if resolver has a parent of type array - add args
    if (parentResolver && store.keys[parentResolver]) {
      if (!res.__args) res.__args = {};
      // args[store.resolverRelationships[parentResolver][resolver]] = store.keys[parentResolver];
      res.__args[resolverMap[parentResolver].nameAsSingular + 'Ids'] = store.keys[parentResolver];
    }

    return res;
  };

  /**
   * Sends a request off to a service
   */
  const sendRequest = async (resolver: string) => {
    // console.log('sendRequest called - resolver: ', resolver);

    // define the query object that will be sent to the service
    const query: {
      [key: string]: {
        [key: string]: any;
      };
    } = {};

    query[resolver] = createResolverQuery(resolver);

    const resolversSent: Set<string> = new Set();

    resolversSent.add(resolver);

    // check if any other resolvers can be completed by the same service
    // TODO: this can be made more efficient if this is checked before this function is called
    // check which resolvers can be resolved 1st etc
    Object.keys(store.requestGroup).forEach((key: string) => {
      if (
        key !== resolver && // not the resolver called initially
        resolverMap[key].serviceUrl === resolverMap[resolver].serviceUrl // has the same resolving service
      ) {
        // console.log(key, 'is from the same service and can be resolved with', resolver);
        // same service, send as part of same request
        query[key] = createResolverQuery(key);
        resolversSent.add(key);
      }
    });

    // console.log('query pre organising', query);

    let resolversToBeSorted = Object.keys(query);

    while (resolversToBeSorted.length) {
      Object.keys(query).forEach((key: string) => {
        const parentResolver = store.requestGroup[key].parent;

        // if resolver has already been sorted
        if (!resolversToBeSorted.includes(key)) {
          return;
        }

        // has a parent resolver - but parent has been resolved already (sent to another service for example)
        if (parentResolver && !store.resolversToSendRequestsTo.includes(parentResolver)) {
          resolversToBeSorted = resolversToBeSorted.filter((e: string) => e !== key);
          return;
        }

        const children = store.requestGroup[key].children;
        const childrenInResolversToBeSortedArray: boolean = children.some(r => resolversToBeSorted.indexOf(r) >= 0);

        // if a resolver has no children
        if (parentResolver && children.length === 0) {
          query[parentResolver][key] = query[key];
          delete query[key];
          resolversToBeSorted = resolversToBeSorted.filter((e: string) => e !== key);
          store.resolversToSendRequestsTo = store.resolversToSendRequestsTo.filter((e: string) => e !== key);
          resolversSent.delete(key);
          return;
        }

        // if a resovler has children + the children are NOT in the resolversToBeSorted array
        if (parentResolver && children.length > 0 && !childrenInResolversToBeSortedArray) {
          query[parentResolver][key] = query[key];
          delete query[key];
          resolversToBeSorted = resolversToBeSorted.filter((e: string) => e !== key);
          store.resolversToSendRequestsTo = store.resolversToSendRequestsTo.filter((e: string) => e !== key);
          resolversSent.delete(key);
          return;
        }

        // if a resovler has children + the children are in the resolversToBeSorted array
        if (parentResolver && children.length > 0 && childrenInResolversToBeSortedArray) {
          return;
        }

        resolversToBeSorted = resolversToBeSorted.filter((e: string) => e !== key);
      });
    }

    // console.log('query:', query);
    // console.log("graphql'd query: ", jsonToGraphQLQuery(query, { pretty: true }));

    const res = await axios({
      url: resolverMap[resolver].serviceUrl,
      method: 'post',
      data: {
        query: jsonToGraphQLQuery({ query }, { pretty: true }),
      },
    });

    // console.log('axios response: ', util.inspect(res.data, false, null));

    // console.log('resolversSent: ', resolversSent);
    resolversSent.forEach((key: string) => {
      if (Array.isArray(res.data.data[key])) {
        store.keys[key] = res.data.data[key].map((item: any) => item[getPrimaryKey(store, key)]);
      } else {
        store.keys[key] = [];
        store.keys[key].push(res.data.data[key][getPrimaryKey(store, key)]);
      }
      // add result to store
      if (!store.results[key]) {
        store.results[key] = {};
      }
      store.results[key].result = res.data.data[key];

      // remove resolver from resolversToSendRequestsTo
      store.resolversToSendRequestsTo = store.resolversToSendRequestsTo.filter((e: string) => e !== key);
    });

    // console.log('keys:', store.keys);
    // console.log('resolversToSendRequestsTo: ', store.resolversToSendRequestsTo);

    return res.data;
  };

  // create an array of services that are awaiting requests to be sent to them
  store.resolversToSendRequestsTo = Object.keys(store.requestGroup);

  // loop through resolvers until all have been completed
  while (store.resolversToSendRequestsTo.length) {
    await asyncForEach(store.resolversToSendRequestsTo, async (resolver: string) => {
      // skip if the resolver has been finished already in a grouped service call
      if (!store.resolversToSendRequestsTo.includes(resolver)) {
        return;
      }

      const parentResolver = store.requestGroup[resolver].parent;
      // check if a parent call is required 1st
      // if the parent resolver is still in the pending calls, skip this until next iteration, then try again
      if (parentResolver && store.resolversToSendRequestsTo.includes(parentResolver)) {
        // do nothing
      } else {
        await sendRequest(resolver);
      }
    });
  }
};
