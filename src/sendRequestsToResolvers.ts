import util from 'util';
// import { resolvers } from '../lib/resolvers';
import Store from './store';

const resolvers: {
  Query: {
    [key: string]: (a: any, b: any, c: any, d: any) => any;
  };
} = {
  Query: {},
};

const asyncForEach = async (array: any[], callback: any) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

export default async (store: Store) => {
  /**
   * Sends a request off to a resolver
   */
  const sendRequest = async (resolver: string) => {
    console.log('sendRequest called - resolver: ', resolver);

    const source = {};
    const args: {
      [key: string]: any;
    } = {};
    const context = {};
    const info = {};
    const parentResolver = store.requestGroup[resolver].parent;

    // if arguments are provided - add to the resolver
    if (Object.keys(store.requestGroup[resolver].arguments).length) {
      Object.keys(store.requestGroup[resolver].arguments).forEach((key: string) => {
        args[key] = store.requestGroup[resolver].arguments[key];
      });
    }

    // if resolver has a parent of type array - add args
    if (parentResolver) {
      args[store.resolverRelationships[parentResolver][resolver]] = store.keys[parentResolver];
    }

    console.log('args123: ', args);

    const res:
      | {
          [key: string]: any;
        }
      | Array<{
          [key: string]: any;
        }> = await resolvers.Query[resolver](source, args, context, info);

    console.log('resolver response: ', util.inspect(res, false, null));

    // add result to resolverMap
    store.resolverMap[resolver].result = res;

    // remove resolver from resolversToSendRequestsTo
    store.resolversToSendRequestsTo = store.resolversToSendRequestsTo.filter((e: string) => e !== resolver);

    // add primary keys to store
    if (parentResolver && store.resolverMap[parentResolver].returnType === 'array' && store.resolverMap[resolver].returnType !== 'array') {
      if (Array.isArray(res)) {
        store.keys[resolver + 's'] = res.map((item: any) => item[store.resolverMap[resolver + 's'].primaryKey]);
      } else {
        store.keys[resolver + 's'] = [];
        store.keys[resolver + 's'].push(res[store.resolverMap[resolver + 's'].primaryKey]);
      }
    } else {
      if (Array.isArray(res)) {
        store.keys[resolver] = res.map((item: any) => item[store.resolverMap[resolver].primaryKey]);
      } else {
        store.keys[resolver] = [];
        store.keys[resolver].push(res[store.resolverMap[resolver].primaryKey]);
      }
    }

    console.log('keys:', store.keys);

    return res;
  };

  // create an array of resolvers that are awaiting requests to be sent to them
  store.resolversToSendRequestsTo = Object.keys(store.requestGroup);
  console.log('resolversToSendRequestsTo: ', store.resolversToSendRequestsTo);

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
