import { gql } from 'apollo-server';

export const userResponses = (query: string) => {
  switch (gql(query)) {
    case gql(`query {
      user (id: 1) {
          id
          firstName
          lastName
      }
    }`):
      return {
        data: {
          data: {
            user: {
              id: 1,
              firstName: 'Josh',
              lastName: 'Kneale',
            },
          },
        },
      };

    case gql(`query {
      users {
          firstName
          id
      }
      user (id: 1) {
          firstName
          id
      }
  }`):
      return {
        data: {
          data: {
            users: [
              {
                firstName: 'Josh',
                id: 1,
              },
              {
                firstName: 'Tony',
                id: 2,
              },
              {
                firstName: 'Bruce',
                id: 3,
              },
            ],
            user: {
              firstName: 'Josh',
              id: 1,
            },
          },
        },
      };

    case gql(`query {
      users {
          id
          firstName
          lastName
      }
  }`):
      return {
        data: {
          data: {
            users: [
              {
                id: 1,
                firstName: 'Josh',
                lastName: 'Kneale',
              },
              {
                id: 2,
                firstName: 'Tony',
                lastName: 'Stark',
              },
              {
                id: 3,
                firstName: 'Bruce',
                lastName: 'Banner',
              },
            ],
          },
        },
      };

    case gql(`query {
      users {
          firstName
          lastName
          id
          comments {
              id
              userId
              content
          }
      }
  }`):
      return {
        data: {
          data: {
            users: [
              {
                firstName: 'Josh',
                lastName: 'Kneale',
                id: 1,
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
                id: 2,
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
                id: 3,
                comments: [],
              },
            ],
          },
        },
      };
    default:
      throw new Error('user query not valid');
  }
};

export const walletResponses = (query: string) => {
  switch (gql(query)) {
    case gql(`query {
      wallets {
          userId
          amount
      }
  }`):
      return {
        data: {
          data: {
            wallets: [
              {
                userId: 1,
                amount: 11,
              },
              {
                userId: 2,
                amount: 100,
              },
              {
                userId: 3,
                amount: 60,
              },
            ],
          },
        },
      };

    case gql(`query {
      wallet (userIds: [1, 2, 3]) {
          amount
          userId
      }
      limit (userIds: [1, 2, 3]) {
          loss
          deposit
          userId
      }
  }`):
      return {
        data: {
          data: {
            wallet: [
              {
                amount: 11,
                userId: 1,
              },
              {
                amount: 100,
                userId: 2,
              },
              {
                amount: 60,
                userId: 3,
              },
            ],
            limit: [
              {
                loss: 20,
                deposit: 80,
                userId: 1,
              },
              {
                loss: 45,
                deposit: 100,
                userId: 2,
              },
              {
                loss: 12,
                deposit: 15,
                userId: 3,
              },
            ],
          },
        },
      };
    default:
      throw new Error('wallet query not valid');
  }
};
