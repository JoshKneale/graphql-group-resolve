export default class Store {
  /**
   * Store for resolvers.
   * Contains the service in which they are resolved, their return type and their primaryKey
   */
  public resolverMap: {
    [key: string]: {
      service: string;
      returnType: string;
      primaryKey: string;
      result?: any;
      mappedResults?: {
        [key: string]: object[];
      };
    };
  } = {
    users: { service: 'user', returnType: 'array', primaryKey: 'id' },
    user: { service: 'user', returnType: 'object', primaryKey: 'id' },
    comment: { service: 'user', returnType: 'object', primaryKey: 'id' },
    comments: { service: 'user', returnType: 'array', primaryKey: 'id' },
    address: { service: 'user', returnType: 'object', primaryKey: 'userId' },
    addresss: { service: 'user', returnType: 'array', primaryKey: 'userId' },
    notes: { service: 'user', returnType: 'array', primaryKey: 'commentId' },
  };
  // TODO: fill this object these dynamically

  /**
   * Store for primary keys
   *
   * Used for sub-resolvers that rely on arguments to be passed
   */
  public keys: {
    [key: string]: number[];
  } = {};

  /**
   * An array of strings containing a list of resolvers
   *
   * Resolvers are removed from this array as they are completed
   */
  public resolversToSendRequestsTo: string[] = [];

  // TODO: add desc
  public resolversToBuild: string[] = [];

  // TODO: add desc
  public templates: {
    [key: string]: {
      [key: string]: string;
    };
  } = {};

  /**
   * Store for resolvers, their fields, any arguments and if they are a sub-resolver or not (have a parent resolver)
   */
  public requestGroup: {
    [key: string]: {
      fields: Set<string>;
      parent: string | undefined;
      arguments: {
        [key: string]: any;
      };
    };
  } = {};

  // TODO: add desc
  // TODO: fill this dynamically
  public resolverRelationships: {
    [key: string]: {
      [key: string]: string;
    };
  } = {
    users: {
      comments: 'userId',
      comment: 'userId',
    },
    user: {
      address: 'userId',
      comments: 'userId',
      comment: 'userId',
    },
    comments: {
      notes: 'commentId',
    },
  };

  /**
   * Empty all the store objects
   */
  public clearStores = () => {
    this.requestGroup = {};
    this.keys = {};
    this.resolversToSendRequestsTo = []; // this should be empty anyway
    this.resolversToBuild = []; // this should be empty anyway
    this.templates = {};
    Object.keys(this.resolverMap).forEach(a => {
      delete this.resolverMap[a].result; // remove result from resolverMap
      delete this.resolverMap[a].mappedResults; // remove mappedResults from resolverMap
    });
  };
}
