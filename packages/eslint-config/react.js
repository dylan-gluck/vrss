/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  extends: [
    "./index.js",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
  ],
  plugins: ["react", "react-hooks", "jsx-a11y"],
  env: {
    browser: true,
  },
  settings: {
    react: {
      version: "detect",
    },
  },
  rules: {
    "react/react-in-jsx-scope": "off", // Not needed in React 18+
    "react/prop-types": "off", // Using TypeScript for prop validation
  },
};
