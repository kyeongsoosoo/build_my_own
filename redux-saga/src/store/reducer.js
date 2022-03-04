import {combineReducers} from 'redux';

export const actionTypes = {
  FETCH_DATA_REQUEST: 'FETCH_DATA_REQUEST',
  FETCH_DATA_SUCCESS: 'FETCH_DATA_SUCCESS',
  FETCH_DATA_FAILED: 'FETCH_DATA_FAILED',
};

const initialState = {
  name: '',
  surname: '',
  region: '',
  error: '',
};

const personState = (state = initialState, action) => {
  switch (action.type) {
    case actionTypes.FETCH_DATA_REQUEST:
      return state;
    case actionTypes.FETCH_DATA_SUCCESS:
      return {
        name: action.payload.name,
        surname: action.payload.surname,
        region: action.payload.region,
        error: '',
      };
    case actionTypes.FETCH_DATA_FAILED:
      return {
        ...state,
        error: action.payload,
      };
    default:
      return state;
  }
};

export default combineReducers({
  personState,
});
