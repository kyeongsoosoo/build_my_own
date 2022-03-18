useSelector는 context api와 다르게 state가 변하더라도 계산된 값이 같다면 리렌더링을 일으키지 않습니다.
[참고한 포스팅](https://medium.com/async/how-useselector-can-trigger-an-update-only-when-we-want-it-to-a8d92306f559)에 원리에 대한 설명과 함께 간단한 구현이 소개되어 있어 정리해봤습니다.

## 개인 정리

`useSelector`를 사용할 경우 `useReducer`를 활용한 일종의 트릭으로 리렌더링을 피할 수 있었습니다.
포스팅에서는 `selectorRef`와 `selectorStateRef`를 이용해 기존 상태와 변화된 상태를 비교하는 방식을 사용했습니다.
`react-redux`에서 사용한 방식과 같습니다.

추가로 실제 `react-redux`에서는 구독관계가 어떤 과정으로 설정되어 `store`가 변경되었을 때 `checkForUpdates` 함수를 호출할 수 있는지 찾아봤습니다.

`useSelector` 내에서 우선 `Subscription` 클래스를 생성합니다.

```ts
const subscription = useMemo(
  () => new Subscription(store, contextSub),
  [store, contextSub],
);
```

`store`와 `contextSub`은 어디서 전달될까요?
`useSelector`가 생성되는 `creatorSelectorHook` 함수를 보면 알 수 있습니다.

```ts
export function createSelectorHook(context = ReactReduxContext) {
  const useReduxContext =
    context === ReactReduxContext
      ? useDefaultReduxContext
      : () => useContext(context);
  return function useSelector(selector, equalityFn = refEquality) {
    if (process.env.NODE_ENV !== 'production' && !selector) {
      throw new Error(`You must pass a selector to useSelectors`);
    }
    const {store, subscription: contextSub} = useReduxContext();

    return useSelectorWithStoreAndSubscription(
      selector,
      equalityFn,
      store,
      contextSub,
    );
  };
}
```

이후 `useDefaultReduxContext`가 어떤 형태인지도 살펴보겠습니다.
지금은 `store`와 `contextSub`가 앱의 `Root`에서부터 `context`를 통해 전달되는 것까지 알면 충분할 것 같습니다.

`subscription` 생성 이후 `useIsomorphicLayoutEffect`가 실행될 때 `subscription`은 구독을 시작합니다.

```ts
useIsomorphicLayoutEffect(() => {
    function checkForUpdates() {
      try {
        const newSelectedState = latestSelector.current(store.getState())

        if (equalityFn(newSelectedState, latestSelectedState.current)) {
          return
        }

        latestSelectedState.current = newSelectedState
      } catch (err) {
        // we ignore all errors here, since when the component
        // is re-rendered, the selectors are called again, and
        // will throw again, if neither props nor store state
        // changed
        latestSubscriptionCallbackError.current = err
      }

      forceRender({})
    }

    subscription.onStateChange = checkForUpdates
    subscription.trySubscribe()
    //...
    //...
```

이제 `Subscription` 클래스가 어떤 역할을 하는지 살펴보겠습니다.

```ts
export default class Subscription {
  constructor(store, parentSub) {
    this.store = store
    this.parentSub = parentSub
    this.unsubscribe = null
    this.listeners = nullListeners

    this.handleChangeWrapper = this.handleChangeWrapper.bind(this)
  }

  addNestedSub(listener) {
    this.trySubscribe()
    return this.listeners.subscribe(listener)
  }

  notifyNestedSubs() {
    this.listeners.notify()
  }

  handleChangeWrapper() {
    if (this.onStateChange) {
      this.onStateChange()
    }
  }

  isSubscribed() {
    return Boolean(this.unsubscribe)
  }

  trySubscribe() {
    if (!this.unsubscribe) {
      this.unsubscribe = this.parentSub
        ? this.parentSub.addNestedSub(this.handleChangeWrapper)
        : this.store.subscribe(this.handleChangeWrapper)

      this.listeners = createListenerCollection()
    }
  }

```

`useIsomorphicLayoutEffect`에서 `trySubscribe` 메서드를 호출하기 때문에 여기서부터 따라가보겠습니다.
`this.parentSub`이 `addNestedSub` 메서드를 호출하도록 합니다.
메서드를 따라가면 `this.parentSub`의 `listener`에 전달된 `this.handleChangeWrapper`를 구독시키는 것을 볼 수 있습니다.
`PubSub` 패턴은 `redux` 전반적으로 쓰이고 있으므로 여기서도 종단에는 `store`가 변경됐을 때 구독 중인 `listeners`에게 `notify`하여 `checkForUpdates` 함수가 실행될 것임을 예상할 수 있겠습니다.

[`createListenerCollection` 함수](https://github.com/reduxjs/react-redux/blob/607f1ba30417b631a4df18665dfede416c7208cf/src/utils/Subscription.js#L10)를 보면 필요한 메서드가 존재합니다.

마지막으로 `parentSub`의 역할을 하는 루트 `context`가 어떻게 전달되는지 보겠습니다.

```ts
function Provider({store, context, children}) {
  const contextValue = useMemo(() => {
    const subscription = new Subscription(store);
    subscription.onStateChange = subscription.notifyNestedSubs;
    return {
      store,
      subscription,
    };
  }, [store]);

  const previousState = useMemo(() => store.getState(), [store]);

  useEffect(() => {
    const {subscription} = contextValue;
    subscription.trySubscribe();

    if (previousState !== store.getState()) {
      subscription.notifyNestedSubs();
    }
    return () => {
      subscription.tryUnsubscribe();
      subscription.onStateChange = null;
    };
  }, [contextValue, previousState]);

  const Context = context || ReactReduxContext;

  return <Context.Provider value={contextValue}>{children}</Context.Provider>;
}
```

`contextValue` 변수에 `parentSub` 역할을 하는 `subscription` 클래스가 생성됩니다.
`previousState`로 기존 상태를 저장해두고 있습니다.
`store`가 변경되면 `useEffect` 훅이 재실행 되는데, 기존 상태와 바뀐 상태가 다를 경우 `subscription.notifyNestedSubs` 메서드가 실행됩니다.
`notifyNestedSubs`를 통해 실행될 `listeners`에는 `checkForUpdates` 함수들이 있을 것입니다.

따라서 위와 같은 과정을 통해 `store`가 변경될 때마다 `useSelector`도 반환되는 값의 변화가 있는지 `checkForUpdates` 함수를 통해 검사할 수 있습니다.
