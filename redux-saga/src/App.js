import React from 'react';
import {connect} from 'react-redux';
import {fetchDataRequest} from './store/actions';

const App = props => (
  <React.Fragment>
    <div className="button" onClick={() => props.fetchDataRequest('male')}>
      Fetch a random male name!
    </div>

    <div className="button" onClick={() => props.fetchDataRequest('female')}>
      Fetch a random male name!
    </div>

    <div>
      Hey, I'm {props.personState.name} {props.personState.surname} from{' '}
      {props.personState.region}
    </div>
  </React.Fragment>
);

const mapStateToProps = ({personState}) => ({personState});

export default connect(mapStateToProps, {fetchDataRequest})(App);
