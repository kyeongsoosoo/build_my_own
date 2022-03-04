export const createStore = reducer => {
    let state

    const listeners = []

    const getState = () => state

    const dispatch = action => {
        state = reducer(state, action)
        listeners.forEach(listener => listener())

        return action
    }

    const subscribe = listener => {
        listeners.push(listener)

        return function unsubscribe(){
            const idx = listeners.indexOf(listener)
            listeners.splice(idx, 1)
        }
    }

    return {
        getState,
        dispatch,
        subscribe
    }
}

export const combineReducers = reducers => {
    const reducerKeys = Object.keys(reducers)
    function combinedReducer(state = {}, action){
        const nextState = {}
        reducerKeys.forEach(key => {
            nextState[key] = reducers[key](state[key], action)
        })
        return nextState
    }

    return combinedReducer
}

export const applyMiddleware = (...middlewares) => {
    return createStore => reducer => {
        const store = createStore(reducer)
        return {
            ...store,
            dispatch: function dispatch(action){
                return middlewares(store)(store.dispatch)(action)
            }
        }
    }
}

export const bindActionCreators = (actionCreators, dispatch) => {
    const boundedActionCreators = {}
    const actionKeys = Object.keys(actionCreators)
    actionKeys.forEach(key => {
        const actionCreator = actionCreators[key]
        boundedActionCreators[key] = function boundedActionCreator(){
            return dispatch(actionCreator.apply(this, arguments))
        }
    })

    return boundedActionCreators
}