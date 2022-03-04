import axios from 'axios';
import {call, put} from './effects';

const fetchData = URL => axios.get(URL);

export function* fetchDataWorker(action) {
  try {
    const response = yield call(
      fetchData,
      `https://uinames.com/api/?gender=${action.payload}`,
    );

    yield put({type: 'FETCH_DATA_SUCCESS', payload: response.data});
  } catch (error) {
    yield put({type: 'FETCH_DATA_FAILED', payload: error.message});
  }
}
