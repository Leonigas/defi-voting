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

export const STATUS = {
  REG_VOTERS: 0,
  REG_PROPOSALS: 1,
  END_REG: 2,
  VOTING: 3,
  END_VOTING: 4,
  TALLY: 5,
}

class App extends Component {
  state = { web3: null, accounts: null, contract: null, voters: null };

  enumStatus = [
    { name: "Enregistrement des électeurs", color: "#696969" },
    { name: "Enregistrement des propositions", color: "#6495ED" },
    { name: "Fin des propositions", color: "#008B8B" },
    { name: "Début du vote", color: "#2F4F4F" },
    { name: "Fin du vote", color: "#191970" },
    { name: "Décompte fait", color: "#006400" }
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
    const { contract } = this.state;

    // récupérer la liste des comptes autorisés
    const voters = await contract.methods.getAddresses().call();
    const status = await contract.methods.status().call()
    const statusName = this.enumStatus[status].name
    const statusColor = this.enumStatus[status].color
    const ownerAddress = await contract.methods.owner().call();
    
    // Mettre à jour le state 
    this.setState({ voters: voters, status: status, statusName: statusName, statusColor: statusColor, ownerAddress: ownerAddress });
  }

  registerVoter = async () => {
    const { accounts, contract } = this.state;
    const address = this.address.value;

    // Interaction avec le smart contract pour ajouter un compte 
    await contract.methods.registerVoter(address).send({from: accounts[0]});
    // Récupérer la liste des comptes autorisés
    this.runInit();
  }

  nextStatus = async() => {
    const { accounts, contract, status } = this.state;

    console.log("STATUS : " , parseInt(status) , STATUS.END_REG)

    switch(parseInt(status)) {
      case STATUS.REG_VOTERS:
        await contract.methods.startProposalregistration().send({from: accounts[0]});
        break;
      case STATUS.REG_PROPOSALS:
          await contract.methods.endProposalregistration().send({from: accounts[0]});
          break;
      case STATUS.END_REG:
        await contract.methods.startVotingSession().send({from: accounts[0]});
        break;
      case STATUS.VOTING:
        await contract.methods.endVotingSession().send({from: accounts[0]});
        break;
      case STATUS.END_VOTING:
          await contract.methods.tally().send({from: accounts[0]});
          break;
      case STATUS.TALLY:
        await contract.methods.startVotersregistration().send({from: accounts[0]});
        break;
      default:
        break;
    }

    this.runInit();
  }

  render() {
    const { accounts, status, voters, statusColor, statusName, ownerAddress } = this.state;

    if (accounts && accounts[0] === ownerAddress) {
      return (
        <div className="App">
          <div style={{display: 'flex', justifyContent: 'center', color: "white", border: "1px solid "+statusColor, backgroundColor: statusColor}}>
            <span style={{padding: "5px"}}>{ status + ' - ' + statusName }</span>
            <Button style={{padding: "5px"}} onClick={ this.nextStatus } variant="light" > Suivant </Button>
          </div>

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
          { parseInt(status) === STATUS.REG_VOTERS && (<div style={{display: 'flex', justifyContent: 'center'}}>
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
          </div>) }
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
