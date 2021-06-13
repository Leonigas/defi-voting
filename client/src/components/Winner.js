import React from "react";
import 'bootstrap/dist/css/bootstrap.min.css';

class Winner extends React.Component {
    render() {
      return <div>
                <p>Le gagnant est :</p>
                <h1>{ this.props.winner.description }</h1>
                <p>Avec { this.props.winner.votecount } voix</p>
            </div>;
    }
}

export default Winner;

