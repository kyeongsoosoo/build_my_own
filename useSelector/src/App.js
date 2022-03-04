import React, {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';

const getInitialState = () => ({
  clicks: 0,
  time: 0,
});

const getCombinedReducers = () => (state, action) => {
  switch (action.type) {
    case 'CLICK':
      return {
        ...state,
        clicks: state.clicks + 1,
      };
    case 'TIME':
      return {
        ...state,
        time: state.time + 1,
      };
    default:
      return state;
  }
};

const initialState = getInitialState();
const myReducer = getCombinedReducers();

const MyContext = React.createContext(initialState);

const MyProvider = ({children}) => {
  const [store, dispatch] = useReducer(myReducer, initialState);

  const storeRef = useRef(store);
  storeRef.current = store;

  const subscribersRef = useRef([]);

  useLayoutEffect(() => {
    subscribersRef.current.forEach(sub => sub());
  }, [store]);

  const value = useMemo(
    () => ({
      dispatch,
      subscribe: cb => {
        subscribersRef.current.push(cb);
        return () => {
          subscribersRef.current = subscribersRef.current.filter(
            sub => sub !== cb,
          );
        };
      },
      getState: () => storeRef.current,
    }),
    [],
  );

  return <MyContext.Provider value={value}>{children}</MyContext.Provider>;
};

const useSelector = selector => {
  const [, forceRender] = useReducer(s => s + 1, 0);
  const store = useContext(MyContext);

  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const selectedStateRef = useRef(selector(store.getState()));
  selectedStateRef.current = selector(store.getState());

  const checkForUpdates = useCallback(() => {
    const newState = selectorRef.current(store.getState());

    if (newState !== selectedStateRef.current) forceRender({});
  }, [store]);

  useEffect(() => {
    const subscription = store.subscribe(checkForUpdates);
    return () => subscription();
  }, [store, checkForUpdates]);

  return selectedStateRef.current;
};

const useOnClick = () => {
  const {dispatch} = useContext(MyContext);
  return () => dispatch({type: 'CLICK'});
};

const useTimer = () => {
  const {dispatch} = useContext(MyContext);
  useEffect(() => {
    const interval = setInterval(() => dispatch({type: 'TIME'}), 1000);
    return () => clearInterval(interval);
  }, [dispatch]);
};

const Clicker = () => {
  console.log('render clicker');
  const onClick = useOnClick();
  const clicks = useSelector(store => store.clicks);
  return (
    <div>
      <span>{`Clicks: ${clicks}`}</span>
      <button onClick={onClick}>Click me</button>
    </div>
  );
};

const Timer = () => {
  console.log('render timer');
  useTimer();
  const time = useSelector(store => store.time);
  return (
    <div>
      <span>{`Time: ${time}`}</span>
    </div>
  );
};

export default function App() {
  return (
    <MyProvider>
      <Clicker />
      <Timer />
    </MyProvider>
  );
}
