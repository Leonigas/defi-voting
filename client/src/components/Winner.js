import React from "react";
import 'bootstrap/dist/css/bootstrap.min.css';

class Winner extends React.Component {
    render() {
      return <div>
                <p>Le gagnant est :</p>
                <h1>{ this.props.winner[0] }</h1>
                <p>Avec { this.props.winner[1] } voix</p>
            </div>;
    }
}

export default Winner;

