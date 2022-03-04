import {actionTypes} from './reducer';

export const fetchDataRequest = gender => ({
  type: actionTypes.FETCH_DATA_REQUEST,
  payload: gender,
});
