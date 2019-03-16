/**
 * THINGS TO TEST:
 * - different queries being passed into group-resolve
 * - importing of resovler data
 */

import { expect } from 'chai';
import proxyquire from 'proxyquire';
import { userResponses, walletResponses } from './mock-responses';
import { resolverMap } from '../src/resolverDeets';

interface IAxiosArgs {
  url: string;
  method: string;
  data: {
    query: string;
  };
}

/**
 * Require group-resolve function with custom level on axios responses
 * - to count the requests sent
 * - to respond with the correct mocked data
 */
const customAxios = async (args: IAxiosArgs) => {
  if (args.url === 'user') {
    serviceCalls.user++;
    return userResponses(args.data.query);
  }
  if (args.url === 'wallet') {
    serviceCalls.wallet++;
    return walletResponses(args.data.query);
  }
  throw new Error('args.url is not valid');
};

const sendReqs = proxyquire('../src/sendRequestsToServices', { axios: customAxios });
const groupResolve = proxyquire('../src/groupResolve', { './index': { isHub: true }, './sendRequestsToServices': sendReqs }).default;

/**
 * Mock resolverMap
 */
resolverMap.users = { serviceUrl: 'user', returnType: 'array', nameAsSingular: 'user', groupArgs: [] };
resolverMap.user = { serviceUrl: 'user', returnType: 'object', nameAsSingular: 'user', groupArgs: [] };
resolverMap.wallet = { serviceUrl: 'wallet', returnType: 'object', nameAsSingular: 'wallet', groupArgs: ['userIds'] };
resolverMap.wallets = { serviceUrl: 'wallet', returnType: 'array', nameAsSingular: 'wallet', groupArgs: [] };
resolverMap.limit = { serviceUrl: 'wallet', returnType: 'object', nameAsSingular: 'limit', groupArgs: ['userIds'] };
resolverMap.limits = { serviceUrl: 'wallet', returnType: 'array', nameAsSingular: 'limit', groupArgs: [] };
resolverMap.comment = { serviceUrl: 'user', returnType: 'object', nameAsSingular: 'comment', groupArgs: [] };
resolverMap.comments = { serviceUrl: 'user', returnType: 'array', nameAsSingular: 'comment', groupArgs: [] };

const schemas = {
  a: `{
    user(id:1) {
      id
      firstName
      lastName
    }
  }`,
  b: `{
    wallets {
      userId
      amount
    }
  }`,
  c: `{
    users {
      firstName
    }

    user(id: 1){
      firstName
    }

    wallets{
      userId
      amount
    }
  }`,
  d: `{
    users{
      id
      firstName
      lastName
      wallet {
        amount
      }
      limit {
        loss
        deposit
      }
    }
  }`,
  e: `{
    users {
      firstName
      lastName
      comments {
        id
        userId
        content
      }
    }
  }`,
};

const serviceCalls = {
  user: 0,
  wallet: 0,
};

describe('queries to default back to graphQL behaviour [not use group-resolve]', () => {
  beforeEach(() => {
    serviceCalls.user = 0;
    serviceCalls.wallet = 0;
  });

  it('query example a', async () => {
    let test: boolean = false;
    await groupResolve(
      { queryString: schemas.a },
      () => {
        test = true;
      },
      {},
    );
    expect(test).to.be.true;
  });

  it('query example b', async () => {
    let test: boolean = false;
    await groupResolve(
      { queryString: schemas.b },
      () => {
        test = true;
      },
      {},
    );
    expect(test).to.be.true;
  });

  it('query example c', async () => {
    let test: boolean = false;
    await groupResolve(
      { queryString: schemas.c },
      () => {
        test = true;
      },
      {},
    );
    expect(test).to.be.true;
  });
});

describe('queries to use group-resolve', () => {
  beforeEach(() => {
    serviceCalls.user = 0;
    serviceCalls.wallet = 0;
  });

  it('query example d', async () => {
    const res = await groupResolve(
      { queryString: schemas.d },
      () => {
        throw new Error('OOPS');
      },
      {},
    );
    expect(res).to.deep.equal({
      data: {
        users: [
          {
            id: 1,
            firstName: 'Josh',
            lastName: 'Kneale',
            wallet: {
              amount: 11,
            },
            limit: {
              loss: 20,
              deposit: 80,
            },
          },
          {
            id: 2,
            firstName: 'Tony',
            lastName: 'Stark',
            wallet: {
              amount: 100,
            },
            limit: {
              loss: 45,
              deposit: 100,
            },
          },
          {
            id: 3,
            firstName: 'Bruce',
            lastName: 'Banner',
            wallet: {
              amount: 60,
            },
            limit: {
              loss: 12,
              deposit: 15,
            },
          },
        ],
      },
    });
    expect(serviceCalls.user).to.equal(1);
    expect(serviceCalls.wallet).to.equal(1);
  });

  it('query example e', async () => {
    const res = await groupResolve(
      { queryString: schemas.e },
      () => {
        throw new Error('OOPS');
      },
      {},
    );
    expect(res).to.deep.equal({
      data: {
        users: [
          {
            firstName: 'Josh',
            lastName: 'Kneale',
            comments: [
              {
                id: 1,
                userId: 1,
                content: 'my comment',
              },
              {
                id: 2,
                userId: 1,
                content: 'my other comment',
              },
            ],
          },
          {
            firstName: 'Tony',
            lastName: 'Stark',
            comments: [
              {
                id: 3,
                userId: 2,
                content: 'test comment',
              },
            ],
          },
          {
            firstName: 'Bruce',
            lastName: 'Banner',
            comments: [],
          },
        ],
      },
    });
    expect(serviceCalls.user).to.equal(1);
  });
});
