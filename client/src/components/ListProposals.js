import React from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import Card from 'react-bootstrap/Card';
import ListGroup from 'react-bootstrap/ListGroup';
import Table from 'react-bootstrap/Table';

class ListProposals extends React.Component {
    render() {
      return <div>
            <div style={{display: 'flex', justifyContent: 'center'}}>
            <Card style={{ width: '50rem' }}>
                <Card.Header><strong>Liste des propositions</strong></Card.Header>
                <Card.Body>
                <ListGroup variant="flush">
                    <ListGroup.Item>
                    <Table striped bordered hover>
                        <tbody>
                        { this.props.proposals.map((a) => <tr><td>{a}</td></tr>) }
                        </tbody>
                    </Table>
                    </ListGroup.Item>
                </ListGroup>
                </Card.Body>
            </Card>
            </div>
        </div>;
    }
}

export default ListProposals;

