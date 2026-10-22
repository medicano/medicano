import { UserSchema } from '../schemas/user.schema';

describe('UserSchema', () => {
  afterEach(() => jest.clearAllMocks());

  it('should leave passwordHash out of queries unless explicitly selected', () => {
    const passwordHashPath = UserSchema.path('passwordHash');

    expect(passwordHashPath.options.select).toBe(false);
  });
});
