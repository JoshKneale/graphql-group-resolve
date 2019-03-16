/**
 * Store for resolvers.
 * Contains the service in which they are resolved, their return type and their primaryKey
 */
export const resolverMap: {
  [key: string]: {
    serviceUrl: string;
    returnType: string;
    nameAsSingular: string;
    groupArgs: string[];
  };
} = {};