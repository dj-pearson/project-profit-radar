// Platform-safe window location helper
const isWeb = typeof window !== "undefined";
export const getWindowLocation = () => {
  if (isWeb && typeof window !== "undefined") {
    return window.location;
  }
  return null;
};
