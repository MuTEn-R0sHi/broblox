/**
 * Clock — thin wrappers around Lua os.clock() / os.time().
 */
export const Clock = {
  now(): number {
    return os.clock();
  },
  timestamp(): number {
    return os.time();
  },
};
