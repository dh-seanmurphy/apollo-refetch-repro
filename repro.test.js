// Run with: npx jest repro.test.js --testPathPattern=repro
//
// Expected (per Apollo's docs/contract): the "c" item always appears after
// clicking "Add".
// Observed: it intermittently never appears, even when the assertion is
// given a very long timeout -- because the underlying observable never
// delivers the completed result to this component's subscription.

const React = require("react");
const { parse } = require("graphql");
const {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} = require("@testing-library/react");
require("@testing-library/jest-dom");
const { MockLink } = require("@apollo/client/testing");
const { MockedProvider } = require("@apollo/client/testing/react");
const { useMutation, useSuspenseQuery } = require("@apollo/client/react");

jest.setTimeout(30000);

const ITEMS_QUERY = parse(`
  query GetItems {
    items
  }
`);

const ADD_ITEM_MUTATION = parse(`
  mutation AddItem {
    addItem
  }
`);

function Items() {
  const { data } = useSuspenseQuery(ITEMS_QUERY);
  return React.createElement(
    "ul",
    null,
    data.items.map((item) => React.createElement("li", { key: item }, item)),
  );
}

function App() {
  const [addItem] = useMutation(ADD_ITEM_MUTATION, {
    refetchQueries: [ITEMS_QUERY],
  });
  return React.createElement(
    React.Fragment,
    null,
    React.createElement("button", { onClick: () => addItem() }, "Add"),
    React.createElement(
      React.Suspense,
      { fallback: React.createElement("p", null, "Loading...") },
      React.createElement(Items),
    ),
  );
}

async function renderApp(mocks) {
  await act(() =>
    render(
      React.createElement(
        MockedProvider,
        { mocks },
        React.createElement(App),
      ),
    ),
  );
}

test("mutation refetchQueries reliably updates a sibling useSuspenseQuery", async () => {
  const mocks = [
    { request: { query: ITEMS_QUERY }, result: { data: { items: ["a", "b"] } } },
    { request: { query: ADD_ITEM_MUTATION }, result: { data: { addItem: true } } },
    { request: { query: ITEMS_QUERY }, result: { data: { items: ["a", "b", "c"] } } },
  ];

  await renderApp(mocks);

  fireEvent.click(screen.getByText("Add"));

  // A very generous timeout: if this bug is a broadcast being dropped (not
  // just slow), the assertion will still fail even at 20s.
  await waitFor(
    () => {
      expect(screen.getByText("c")).toBeInTheDocument();
    },
    { timeout: 20000 },
  );
});
