// replace processGraphQLRequest function with new one
// TODO: more details here
type Writeable<T> = { -readonly [P in keyof T]-?: T[P] };

import * as abc from 'apollo-server-core/dist/requestPipeline';
import { processGraphQLRequestNew } from './mocked-apollo/requestPipeline';

(<Writeable<any>>abc.processGraphQLRequest) = processGraphQLRequestNew;

import { populateResolverDetails, Service } from './populate';
import { inspect } from 'util';

export let isHub: boolean = false;

/**
 * graphql-group-resolve initiation function
 */
export default async (hub: boolean, resolverDetails: Service[]): Promise<void> => {
  if (resolverDetails.some((e: Service) => typeof e.uri !== 'string')) {
    throw new Error(`All uri's must be strings. resolverDetails: ${inspect(resolverDetails, false, null, true)}`);
  }

  // fill resolverMap
  await populateResolverDetails(resolverDetails);

  console.log('graphql-group-resolve enabled');
  if (hub) {
    isHub = true;
    console.log('running group-resolve as hub');
  } else {
    throw new Error('isHub must be true in the current version');
  }
};
