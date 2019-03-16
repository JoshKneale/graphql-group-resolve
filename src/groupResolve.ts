import gql from 'graphql-tag';
import util from 'util';
import mapRequestToObjects from './mapRequestToObjects';
// import sendRequestsToResolvers from './sendRequestsToResolvers';
import sendRequestsToServices from './sendRequestsToServices';
import Store from './store';
import { resolverMap } from './resolverDeets';
import { GraphQLSchema } from 'graphql';
import { isHub } from './index';
import { getPrimaryKey } from './sendRequestsToServices';

export interface RequestParams {
  schema?: GraphQLSchema;
  queryString: string;
}

export default async (data: RequestParams, callback: (a: any) => any, callbackdata: any): Promise<any> => {
  const store = new Store();
  try {
    // destructure request
    const query = gql(data.queryString);
    return shouldUseGroupResolve(query, store) ? groupResolve(query, store) : callback(callbackdata);
  } catch (e) {
    console.log(e);
    return callback(callbackdata);
  }
};

/**
 * Returns if a request is valid for group resolution by checking the following:
 * - that the request is of Query type
 * - that the query has sub-resolvers
 * - that the sub-resolvers are applicable for use with the group-resolve module
 */
const shouldUseGroupResolve = (query: any, store: Store): boolean => {
  // check is of query type
  // console.log('type of request: ', query.definitions[0].operation);
  if (query.definitions[0].operation !== 'query') {
    console.log('group-resolve called with none query type - defaulting to graphQL functionality', util.inspect(query, false, null, true));
    return false;
  }

  mapRequestToObjects(query.definitions[0].selectionSet.selections, store);
  const requestedResolvers: string[] = Object.keys(store.requestGroup);

  // check query has sub-resolvers
  let hasSubResolvers: boolean = false;
  for (let x = 0; x < requestedResolvers.length; x++) {
    const resolver = requestedResolvers[x];
    if (store.requestGroup[resolver].children.length) {
      hasSubResolvers = true;
      break;
    }
  }
  if (!hasSubResolvers) {
    console.log('query does not have any sub-resolvers - defaulting to graphql functionality');
    return false;
  }

  // check sub-resolvers are applicable as group-resolvers
  for (let x = 0; x < requestedResolvers.length; x++) {
    const resolver = requestedResolvers[x];
    const parent = store.requestGroup[resolver].parent;
    // the resolver has a parent AND that the parent and child are in different services
    if (parent && resolverMap[resolver].serviceUrl !== resolverMap[parent].serviceUrl) {
      // check if the resolver has the parents key available to use in the args
      const parentKey = resolverMap[parent].nameAsSingular + 'Ids';
      if (!resolverMap[resolver].groupArgs.includes(parentKey)) {
        console.log(
          `*${resolver}* is not applicable for group-resolve use with parent of *${parent}*, missing argument: *${parentKey}*  - defaulting to graphql functionality`,
        );
        return false;
      }
    }
  }

  return true;
};

const groupResolve = async (_query: any, store: Store) => {
  // console.log('isHub: ', isHub);
  // console.log('resolverMap', util.inspect(resolverMap, false, null));

  if (isHub) {
    await sendRequestsToServices(store);
  } else {
    // await sendRequestsToResolvers(store);
  }

  // console.log('results: ', store.results);

  // console.log('templates: ', store.templates);

  // create responseObject
  const responseObject: any = { data: {} };

  store.resolversToBuild = Object.keys(store.requestGroup);

  while (store.resolversToBuild.length) {
    store.resolversToBuild.forEach((resolver: string) => {
      // skip if the resolver has been finished already in a grouped service call
      if (!store.resolversToBuild.includes(resolver)) {
        return;
      }

      // check for child resolvers
      const children = Object.keys(store.requestGroup).filter(e => store.requestGroup[e].parent === resolver);
      const hasChildren = !!children.length;

      // if resolver has children that need to be mapped 1st, skip
      if (hasChildren && store.resolversToBuild.some(r => children.indexOf(r) >= 0)) {
        return;
      }

      mapResolver(resolver, responseObject, store);

      // console.log('results', util.inspect(store.results, false, null));
    });
  }

  // console.log('responseObject: ', util.inspect(responseObject, false, null));
  return responseObject;
};

const mapResolver = (resolver: string, responseObject: { data: any }, store: Store): void => {
  const template = store.templates[resolver];
  const parentResolver = store.requestGroup[resolver].parent;

  // TODO: ewwwwwww - THIS MAY NOT BE NEEDED ANYMORE - after switching to array type returns to singular resolvers
  if (!store.results[resolver]) {
    // remove resolver from resolversToBuild
    store.resolversToBuild = store.resolversToBuild.filter((e: string) => e !== resolver);
    return;
  }
  const results = store.results[resolver].result;
  const map: {
    [key: string]: object[];
  } = {};

  if (!parentResolver) {
    if (Array.isArray(results)) {
      results.forEach((result: { [key: string]: any }) => {
        if (!responseObject.data[resolver]) {
          responseObject.data[resolver] = [];
        }
        responseObject.data[resolver].push(mapToTemplate(result, template, resolver, store));
      });
    } else {
      responseObject.data[resolver] = mapToTemplate(results, template, resolver, store);
    }

    // remove resolver from resolversToBuild
    store.resolversToBuild = store.resolversToBuild.filter((e: string) => e !== resolver);

    return;
  }

  // declare the key that links this resolver to the level above
  const linkingKey =
    (resolverMap[parentResolver].returnType === 'array' ? parentResolver.substring(0, parentResolver.length - 1) : parentResolver) + 'Id';

  if (Array.isArray(results)) {
    results.forEach((result: { [key: string]: any }) => {
      if (!map[result[linkingKey]]) {
        map[result[linkingKey]] = [];
      }
      map[result[linkingKey]].push(mapToTemplate(result, template, resolver, store));
    });
  } else {
    if (!map[results[linkingKey]]) {
      map[results[linkingKey]] = [];
    }
    map[results[linkingKey]].push(mapToTemplate(results, template, resolver, store));
  }

  store.results[resolver].mappedResults = map;

  // console.log('map: ', map);

  // remove resolver from resolversToBuild
  store.resolversToBuild = store.resolversToBuild.filter((e: string) => e !== resolver);
};

const mapToTemplate = (result: any, template: { [key: string]: string }, resolver: string, store: Store): object => {
  const obj: {
    [key: string]: string | object | number;
  } = {};
  Object.keys(template).forEach((key: string) => {
    if (template[key] === 'field') {
      // if the key is a field, return directly from result
      obj[key] = result[key];
    } else if (template[key] === 'resolver' && store.results[key]) {
      // if the key is a resolver, return from the mappedResults
      const newLocal = store.results[key].mappedResults as any; // TODO: fix the ANY
      const resultList = newLocal[result[getPrimaryKey(store, resolver)]];
      // check resolver return type and set value of the key correctly (either a list or a single object)
      obj[key] = resolverMap[key].returnType === 'object' ? resultList[0] : resultList;
    } else if (template[key] === 'resolver' && result[key]) {
      // if the key is a resolver AND has been resolved via a parent resolver (e.g. during schema sitiching, when requests are grouped to the same URL), return directly from the key
      obj[key] = result[key];
    }
  });
  return obj;
};
