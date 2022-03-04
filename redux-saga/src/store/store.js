import {createStore, applyMiddleware} from 'redux';
import MySaga from './middleware';
import reducer from './reducer';
import {actionTypes} from './reducer';
import {fetchDataWorker} from './sagas';

const sagaInstance = new MySaga();
sagaInstance.registerAction(actionTypes.FETCH_DATA_REQUEST, fetchDataWorker);

const store = createStore(reducer, applyMiddleware(sagaInstance.middleware));

export default store;
