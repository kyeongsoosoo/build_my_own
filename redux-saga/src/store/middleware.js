export default class MySaga{
    constructor(){
        this.actionWatchList = new Map();
    }

    registerAction(actionType, handler){
        this.actionWatchList.set(actionType, handler);
    }

    middleware = store => next => action => {
        const handler = action.type ? this.actionWatchList.get(action.type) : undefined;
        if(handler){
            const handlerInstance = handler(action);

            let yieldedValue = handlerInstance.next();

            (async () => {
                while(!yieldedValue.done){
                    switch(yieldedValue.value.effect){
                        case 'effect/CALL':
                            await yieldedValue.value.payload.apply(null, yieldedValue.value.args)
                                .then(res => {
                                    yieldedValue = handlerInstance.next(res)
                                })
                                .catch(err => {
                                    yieldedValue = handlerInstance.throw(err)
                                });
                            break;
                        case 'effect/PUT':
                            store.dispatch(yieldedValue.value.payload);
                            yieldedValue = handlerInstance.next();
                            break;
                        default:
                            yieldedValue = handlerInstance.next();
                    }
                }
            })();
        }
        next(action);
    }
}