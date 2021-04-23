import React, { Component } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';
import ListGroup from 'react-bootstrap/ListGroup';
import Table from 'react-bootstrap/Table';
import VotingContract from "./contracts/Voting.json";
import getWeb3 from "./getWeb3";

import "./App.css";

class App extends Component {
  state = { web3: null, accounts: null, contract: null, voters: null };

  enumStatus = [
    { name: "Registering Voters", color: "green" },
    { name: "Proposals Registration Started", color: "green" },
    { name: "Proposals Registration Ended", color: "green" },
    { name: "Voting Session Started", color: "green" },
    { name: "Voting Session Ended", color: "green" },
    { name: "Votes Tallied", color: "green" }
  ];

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = VotingContract.networks[networkId];
      const instance = new web3.eth.Contract(
        VotingContract.abi,
        deployedNetwork && deployedNetwork.address,
      );

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3, accounts, contract: instance }, this.runInit);
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  runInit = async () => {
    const { accounts, contract } = this.state;

    // récupérer la liste des comptes autorisés
    const voters = await contract.methods.getAddresses().call();
    const status = await contract.methods.status().call()
    const statusName = this.enumStatus[status].name
    const statusColor = this.enumStatus[status].color
    const isOwner = await contract.methods.isOwner().call();
    const owner_add = await contract.methods.owner().call();

    await contract.methods.isOwner().call((err, is_owner) => 
    {
      console.log(is_owner)
      return is_owner;
    });

    console.log(isOwner, accounts[0], owner_add, accounts[0] === owner_add);
    
    // Mettre à jour le state 
    this.setState({ voters: voters, statusName: statusName, statusColor: statusColor, isOwner: isOwner });
  }

  registerVoter = async () => {
    const { accounts, contract } = this.state;
    const address = this.address.value;

    // Interaction avec le smart contract pour ajouter un compte 
    await contract.methods.registerVoter(address).send({from: accounts[0]});
    // Récupérer la liste des comptes autorisés
    this.runInit();
  }

  startProposalregistration = async() => {
    const { accounts, contract } = this.state;
    await contract.methods.startProposalregistration().send({from: accounts[0]});

    this.runInit();
  }

  render() {
    const { voters, statusColor, statusName, isOwner} = this.state;

    if (isOwner) {
      return (
        <div className="App">
          <span style={{display: 'flex', justifyContent: 'center', padding: "5px", color: "white", border: "1px solid green", backgroundColor: statusColor}}>
            { statusName }
          </span>
          <div>
              <h2 className="text-center">Système de vote</h2>
              <hr></hr>
              <br></br>
          </div>
          <div style={{display: 'flex', justifyContent: 'center'}}>
            <Card style={{ width: '50rem' }}>
              <Card.Header><strong>Liste des votants</strong></Card.Header>
              <Card.Body>
                <ListGroup variant="flush">
                  <ListGroup.Item>
                    <Table striped bordered hover>
                      <thead>
                        <tr>
                          <th>@</th>
                        </tr>
                      </thead>
                      <tbody>
                        {voters !== null &&
                          voters.map((a) => <tr><td>{a}</td></tr>)
                        }
                      </tbody>
                    </Table>
                  </ListGroup.Item>
                </ListGroup>
              </Card.Body>
            </Card>
          </div>
          <br></br>
          <div style={{display: 'flex', justifyContent: 'center'}}>
            <Card style={{ width: '50rem' }}>
              <Card.Header><strong>Autoriser un nouveau compte</strong></Card.Header>
              <Card.Body>
                <Form.Group controlId="formAddress">
                  <Form.Control type="text" id="address"
                  ref={(input) => { this.address = input }}
                  />
                </Form.Group>
                <Button onClick={ this.registerVoter } variant="dark" > Autoriser </Button>
              </Card.Body>
            </Card>
            </div>
            <div style={{display: 'flex', justifyContent: 'center'}}>
              <Card style={{ width: '50rem' }}>
                <Card.Header><strong>Commencer la session d'enregistrement de la proposition.</strong></Card.Header>
                <Card.Body>
                  <Button onClick={ this.startProposalregistration } variant="dark" > Démarrer </Button>
                </Card.Body>
              </Card>
            </div>
          <br></br>
        </div>
      );
    }

    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }

    return <div>You are not admin</div>;

  }
}

export default App;
