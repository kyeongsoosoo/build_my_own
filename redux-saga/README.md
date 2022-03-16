[The (Redux) Saga Continues — Implementing your own redux-saga like middleware](https://medium.com/agency04/the-redux-saga-continues-implementing-your-own-redux-saga-like-middleware-f93a23ed840) 블로그 포스팅을 읽고 직접 구현해 본 예제입니다.


## 추가 정리

제너레이터에 익숙하지 않을 때에는 `yield` 키워드를 사용하는 Saga가 마법같기도 했습니다.

최근까지도 제너레이터에 대한 이해는 있었지만 Saga에서 제공하는 Effect들이 어떻게 동작하는지 궁금해 찾아보았고 구현 원리가 잘 설명된 포스팅을 찾아 예제를 직접 진행해 보았습니다.

[Saga의 개념적인 부분](https://so-so.dev/pattern/saga-pattern-with-redux-saga/)에 대해서는 다른 블로그 포스팅에서 찾을 수 있었습니다. Saga가 하나의 Orchestrator로 동작하는 것을 인지하니 개념적으로 앱 내에서 Saga의 구조를 생각하기 쉬워졌습니다.

Saga 관련 포스팅들에서 공통적으로 알 수 있었던건 Effect도 하나의 자바스크립트 객체라는 점이었습니다.

지난번 포스팅과 비슷하게 [redux-saga](https://github.com/redux-saga/redux-saga)가 실제로 어떻게 구현되어 있는지 찾아 보았습니다.

redux의 소스코드와 비슷하게 핵심 구현 사항 외에도 다른 기능들을 위한 추가적인 코드가 있었기 때문에 코드 중 핵심 동작에 관련된 부분을 따라가며 읽으려고 노력했습니다. (제가 생각한 핵심 동작은 action이 Saga로 전달되어 effect들이 처리되는 것입니다.)

`sagaMiddleware`가 생성되는 과정부터 보겠습니다.

```ts
export default function sagaMiddlewareFactory({ context = {}, channel = stdChannel(), sagaMonitor, ...options } = {}) {
  let boundRunSaga

  if (process.env.NODE_ENV !== 'production') {
    check(channel, is.channel, 'options.channel passed to the Saga middleware is not a channel')
  }

  function sagaMiddleware({ getState, dispatch }) {
    boundRunSaga = runSaga.bind(null, {
      ...options,
      context,
      channel,
      dispatch,
      getState,
      sagaMonitor,
    })

    return next => action => {
      if (sagaMonitor && sagaMonitor.actionDispatched) {
        sagaMonitor.actionDispatched(action)
      }
      const result = next(action) // hit reducers
      channel.put(action)
      return result
    }
  }

  sagaMiddleware.run = (...args) => {
    if (process.env.NODE_ENV !== 'production' && !boundRunSaga) {
      throw new Error('Before running a Saga, you must mount the Saga middleware on the Store using applyMiddleware')
    }
    return boundRunSaga(...args)
  }

  sagaMiddleware.setContext = props => {
    if (process.env.NODE_ENV !== 'production') {
      check(props, is.object, createSetContextWarning('sagaMiddleware', props))
    }

    assignWithSymbols(context, props)
  }

  return sagaMiddleware
}
```

`sagaMonitor`를 제외하고 생각하면 `sagaMiddleware`의 역할은 `channel`에 `action`을 전달하는 것 뿐입니다. `channel`에 전달된 이후의 과정을 알기 위해 `runSaga` 함수를 먼저 알아보겠습니다.

```ts
export function runSaga(
  { channel = stdChannel(), dispatch, getState, context = {}, sagaMonitor, effectMiddlewares, onError = logError },
  saga,
  ...args
) {
  if (process.env.NODE_ENV !== 'production') {
    check(saga, is.func, NON_GENERATOR_ERR)
  }

  const iterator = saga(...args)
// ...
// ...
  const env = {
    channel,
    dispatch: wrapSagaDispatch(dispatch),
    getState,
    sagaMonitor,
    onError,
    finalizeRunEffect,
  }

  return immediately(() => {
    const task = proc(env, iterator, context, effectId, getMetaInfo(saga), /* isRoot */ true, undefined)

    if (sagaMonitor) {
      sagaMonitor.effectResolved(effectId, task)
    }

    return task
  })
```

`sagaMiddleware` 함수와 같이 생각해보면 29번째 라인에서 `boundRunSaga`에 binding 된 `runSaga` 함수를 할당합니다.이후에 `sagaMiddleware.run` 메서드를 실행하면서 `saga`를 전달하여 `boundRunSaga`를 실행합니다. 이 경우 `boundRunSaga`에서는 79번째 라인과 같이 제너레이터가 생성될 것(전달된 saga가 제너레이터가 맞다면)입니다. 그리고 `env`를 설정해 준 뒤 `proc` 함수를 실행합니다.

```ts
export default function proc(env, iterator, parentContext, parentEffectId, meta, isRoot, cont) {
//...
//...
 // kicks up the generator
  next()

  // then return the task descriptor to the caller
  return task

  /**
   * This is the generator driver
   * It's a recursive async/continuation function which calls itself
   * until the generator terminates or throws
   * @param {internal commands(TASK_CANCEL | TERMINATE) | any} arg - value, generator will be resumed with.
   * @param {boolean} isErr - the flag shows if effect finished with an error
   *
   * receives either (command | effect result, false) or (any thrown thing, true)
   */
  function next(arg, isErr) {
    try {
      let result
      if (isErr) {
        result = iterator.throw(arg)
        // user handled the error, we can clear bookkept values
        sagaError.clear()
      } else if (shouldCancel(arg)) {
        /**
          getting TASK_CANCEL automatically cancels the main task
          We can get this value here
          - By cancelling the parent task manually
          - By joining a Cancelled task
        **/
        mainTask.status = CANCELLED
        /**
          Cancels the current effect; this will propagate the cancellation down to any called tasks
        **/
        next.cancel()
        /**
          If this Generator has a `return` method then invokes it
          This will jump to the finally block
        **/
        result = is.func(iterator.return) ? iterator.return(TASK_CANCEL) : { done: true, value: TASK_CANCEL }
      } else if (shouldTerminate(arg)) {
        // We get TERMINATE flag, i.e. by taking from a channel that ended using `take` (and not `takem` used to trap End of channels)
        result = is.func(iterator.return) ? iterator.return() : { done: true }
      } else {
        result = iterator.next(arg)
      }

      if (!result.done) {
        digestEffect(result.value, parentEffectId, next)
      } else {
        /**
          This Generator has ended, terminate the main task and notify the fork queue
        **/
        if (mainTask.status !== CANCELLED) {
          mainTask.status = DONE
        }
        mainTask.cont(result.value)
      }
    } catch (error) {
      if (mainTask.status === CANCELLED) {
        throw error
      }
      mainTask.status = ABORTED

      mainTask.cont(error, true)
    }
  }
```

이 함수에서 `Effect`를 처리하는 로직이 실행됩니다. 
실행되는 `next` 함수는 전달된 `iterator`에서 `next`를 호출한 뒤 `done` 여부를 확인하고 `digestEffect` 함수를 실행합니다.
`next` 함수 밑에 정의된 [digestEffect](https://github.com/redux-saga/redux-saga/blob/master/packages/core/src/internal/proc.js#L155) 함수는 `Effect`에 따른 처리를 해주고 제너레이터가 진행되도록 `next` 메서드를 호출합니다.

`Effect` 별로 처리되는 로직은 [efffectRunnerMap](https://github.com/redux-saga/redux-saga/blob/master/packages/core/src/internal/effectRunnerMap.js)에 정의되어 있는데, 한 가지 살펴보면 `runTakeEffect`에서는 `channel`로 만들어진 콜백을 전달합니다.

제너레이터가 모두 진행된 후에는 `mainTask`의 상태를 완료로 변경하고 진행을 종료합니다.

redux-saga는 redux보다 소스코드를 읽기 어려웠습니다. saga에서 제공하는 기능이 많고 아직 제가 모든 기능을 사용해보지 않았기 때문에 파악이 더 어려웠던 것 같습니다. 그래도 가장 기본적인 동작 원리를 생각해 볼 수 있어 좋은 경험이었습니다. saga에서 제공하는 `channel`을 활용하여 `socket`과 연결하는 등 saga로 더 다양한 작업을 해볼 수 있는 것으로 알고 있어 기회가 된다면 시도해보고 싶습니다. 
그 후에 경험이 쌓인다면 해당 README도 추가로 더 업데이트 해보겠습니다.

