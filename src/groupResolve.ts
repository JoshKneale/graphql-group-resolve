/**
 * TODOS
 * - account for alias'
 * - account for multiple queries in the same request - DONE
 * - - account for sub queries within each - DONE
 * - - account for multiple queries of the same resolver - DONE
 * - auto fill relevant stores
 * - check for resolvers on start up - e.g. if user, there needs to be a users
 * - try it with the wallet & ticket services afterwards to check compatibility
 * - write tests
 */

/**
 * RULES
 * -
 */

import gql from 'graphql-tag';
import util from 'util';
import { RequestParams } from './interfaces';
import mapRequestToObjects from './mapRequestToObjects';
import sendRequestsToResolvers from './sendRequestsToResolvers';
import Store from './store';

const store = new Store();

export const groupResolve = async (data: RequestParams, callback: (a: any) => any, callbackdata: any): Promise<any> => {
  try {
    const res = await run(data);
    return res;
  } catch (e) {
    console.log(e);
    store.clearStores();
    return callback(callbackdata);
  }
};

const run = async (data: RequestParams) => {
  console.log('groupResolve called!');
  console.log('resolverMap: ', store.resolverMap);

  // check that it's a query type TODO: improve this validation
  if (data.queryString[0] !== '{') {
    throw new Error('TRAJ called with none query type - defaulting to Apollo functionality');
  }

  // destructure query
  const query = gql(data.queryString);

  // console.log("gql'd result:", util.inspect(query, false, null));
  // console.log("requestGroup: ", util.inspect(store.requestGroup, false, null));

  mapRequestToObjects(query.definitions[0].selectionSet.selections, store);

  await sendRequestsToResolvers(store);

  console.log('resolverMap', util.inspect(store.resolverMap, false, null));

  console.log('templates: ', store.templates);

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

      mapResolver(resolver, responseObject);

      console.log('resolverMap', util.inspect(store.resolverMap, false, null));
    });
  }

  // clear stores
  store.clearStores();

  console.log('responseObject: ', util.inspect(responseObject, false, null));
  return responseObject;
};

const mapResolver = (resolver: string, responseObject: { data: any }): void => {
  const template = store.templates[resolver];
  const parentResolver = store.requestGroup[resolver].parent;
  const results = store.resolverMap[resolver].result;
  const map: {
    [key: string]: object[];
  } = {};

  if (!parentResolver) {
    if (Array.isArray(results)) {
      results.forEach((result: { [key: string]: any }) => {
        if (!responseObject.data[resolver]) {
          responseObject.data[resolver] = [];
        }
        responseObject.data[resolver].push(mapToTemplate(result, template, resolver));
      });
    } else {
      responseObject.data[resolver] = mapToTemplate(results, template, resolver);
    }

    // remove resolver from resolversToBuild
    store.resolversToBuild = store.resolversToBuild.filter((e: string) => e !== resolver);

    return;
  }

  // declare the key that links this resolver to the level above
  const linkingKey = store.resolverRelationships[parentResolver as string][resolver];

  if (Array.isArray(results)) {
    results.forEach((result: { [key: string]: any }) => {
      if (!map[result[linkingKey]]) {
        map[result[linkingKey]] = [];
      }
      map[result[linkingKey]].push(mapToTemplate(result, template, resolver));
    });
  } else {
    if (!map[results[linkingKey]]) {
      map[results[linkingKey]] = [];
    }
    map[results[linkingKey]].push(mapToTemplate(results, template, resolver));
  }

  store.resolverMap[resolver].mappedResults = map;

  console.log('map: ', map);

  // remove resolver from resolversToBuild
  store.resolversToBuild = store.resolversToBuild.filter((e: string) => e !== resolver);
};

const mapToTemplate = (result: any, template: { [key: string]: string }, resolver: string): object => {
  console.log('mapToTemplate func');
  console.log('resolver: ', resolver);
  const obj: {
    [key: string]: string | object | number;
  } = {};
  Object.keys(template).forEach((key: string) => {
    if (template[key] === 'field') {
      obj[key] = result[key];
    }
    if (template[key] === 'resolver') {
      const newLocal = store.resolverMap[key].mappedResults as any; // TODO: fix the ANY
      const resultList = newLocal[result[store.resolverMap[resolver].primaryKey]];
      // check resovler return type and set value of the key correctly (either a list or a single object)
      obj[key] = store.resolverMap[key].returnType === 'object' ? resultList[0] : resultList;
    }
  });
  return obj;
};
