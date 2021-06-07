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

  /**
   * Met à jour les informations du votant arpès l'évèment VoterRegistered
   */
  updateVoter = async () => {
    const { accounts, contract } = this.state;
    const voter = await contract.methods._voters(accounts[0]).call()
    this.setState({ voter: voter})
  }

  /**
   * Met à jour les propositions après l'évènement ProposalRegistered 
   */
  updateProposals = async () => {
    const { accounts, contract } = this.state;
    const proposals = await contract.methods.getProposals().call()
    this.setState({ proposals: proposals})
  }

  updateStatus = async () => {
    const { contract } = this.state;
    const status = await contract.methods.status().call()
    const statusName = this.enumStatus[status].name
    const statusColor = this.enumStatus[status].color
    this.setState({ status: status, statusName: statusName, statusColor: statusColor })
  }

  runInit = async () => {
    const { accounts, contract } = this.state;

    // enregistrement des évènements
    contract.events.VoterRegistered().on('data', (event) => this.updateVoter(event)).on('error', console.error);
    contract.events.ProposalRegistered().on('data', (event) => this.updateProposals(event)).on('error', console.error);
    contract.events.WorkflowStatusChange().on('data', (event) => this.updateStatus(event)).on('error', console.error);

    // récupérer les listes des votants et des propositions
    const voters = await contract.methods.getAddresses().call()  // TODO get _voters

    // données relatives à la phase en cours
    const status = await contract.methods.status().call()
    const statusName = this.enumStatus[status].name
    const statusColor = this.enumStatus[status].color

    // données personnelles
    const ownerAddress = await contract.methods.owner().call()
    const voter = await contract.methods._voters(accounts[0]).call()

    //const _proposalIds = await contract.methods._proposalIds().call()
    const proposals = await contract.methods.getProposals().call()  // TODO get _voters

    const winningProposalId = await contract.methods.winningProposalId().call();  
    const winner = await contract.methods.getWinner().call();
    
    // Mettre à jour le state 
    this.setState({ voters: voters, status: status, statusName: statusName, statusColor: statusColor, ownerAddress: ownerAddress, voter: voter, proposals: proposals, winningProposalId: winningProposalId, winner:winner})  
  }

  /**
   * Enregistre un nouveau votant
   */
  registerVoter = async () => {
    const { accounts, contract } = this.state;
    const address = this.address.value;

    // Interaction avec le smart contract pour ajouter un compte 
    await contract.methods.registerVoter(address).send({from: accounts[0]});

    // Vide le champs input address
    this.address.value = null;
  }

  registerProposal = async () => {
    const { accounts, contract } = this.state;
    const proposal = this.proposal.value;

    await contract.methods.registerProposal(proposal).send({from: accounts[0]});

    // Vide le champs input proposal
    this.proposal.value = null;
  }

  vote = async () => {
    const { accounts, contract } = this.state;
    const vote = this.vote.value;

    await contract.methods.vote(vote).send({from: accounts[0]});
    
    // Vide le champs input proposal
    this.vote.value = null;
  }

  tally = async () => {
    const { accounts, contract } = this.state;

    await contract.methods.tally().send({from: accounts[0]});
    const winningProposalId = await contract.methods.winningProposalId().send({from: accounts[0]});
    const winner = await contract.methods._proposals(winningProposalId).send({from: accounts[0]});

    console.log(winningProposalId, winner)

    this.setState({ winner: winner })
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

    // this.runInit();
  }

  render() {
    const { accounts, status, voters, statusColor, statusName, ownerAddress, voter, proposals, winner } = this.state;

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

          { parseInt(status) === STATUS.REG_PROPOSALS || parseInt(status) === STATUS.VOTING && (<div><div style={{display: 'flex', justifyContent: 'center'}}>
            <Card style={{ width: '50rem' }}>
              <Card.Header><strong>Liste des propositions</strong></Card.Header>
              <Card.Body>
                <ListGroup variant="flush">
                  <ListGroup.Item>
                    <Table striped bordered hover>
                      <thead>
                        <tr>
                          <th>Propositions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proposals !== null &&
                          proposals.map((a) => <tr><td>{a}</td></tr>)
                        }
                      </tbody>
                    </Table>
                  </ListGroup.Item>
                </ListGroup>
              </Card.Body>
            </Card>
          </div></div>) }

          { parseInt(status) === STATUS.END_VOTING && (<div><div style={{display: 'flex', justifyContent: 'center'}}>
            <Card style={{ width: '50rem' }}>
              <Card.Header><strong>Décompte</strong></Card.Header>
              <Card.Body>
                <ListGroup variant="flush">
                  <ListGroup.Item>
                    <Table striped bordered hover>
                      <thead>
                        <tr>
                          <th>Propositions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proposals !== null &&
                          proposals.map((a) => <tr><td>{a.description} - {a.voteCount}</td></tr>)
                        }
                      </tbody>
                    </Table>
                  </ListGroup.Item>
                </ListGroup>
              </Card.Body>
            </Card>
          </div>
          <div style={{display: 'flex', justifyContent: 'center'}}>
            <Card style={{ width: '50rem' }}>
              <Card.Header><strong>Action</strong></Card.Header>
              <Card.Body>
                <Button onClick={ this.tally } variant="dark" > Faire le décompte ! </Button>
              </Card.Body>
            </Card>
          </div></div>) }

          { parseInt(status) === STATUS.TALLY && (<div>
            <div style={{display: 'flex', justifyContent: 'center'}}>
              <strong>Le gagnant est :</strong>
          </div>
          <div style={{display: 'flex', justifyContent: 'center'}}>
            <h1>{ winner }</h1>
          </div>
          </div>) }

          <br></br>
        </div>
      );
    }

    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }

    return (
      <div className="App">
        <div style={{display: 'flex', justifyContent: 'center', color: "white", border: "1px solid "+statusColor, backgroundColor: statusColor}}>
          <span style={{padding: "5px"}}>{ status + ' - ' + statusName }</span>
        </div>

        <div>
          <h2 className="text-center">Système de vote</h2>
          <hr></hr>
          <br></br>
        </div>

        { parseInt(status) === STATUS.REG_VOTERS && (<div style={{display: 'flex', justifyContent: 'center'}}>
            <p className="text-center text-warning">L'administrateur est en train d'enregister les électeurs. Revenez plus tard ...</p>
            <Card style={{ width: '50rem' }}>
              <Card.Header><strong>Entregistrement</strong></Card.Header>
              <Card.Body>
                { voter && voter.isRegistered && (<p className='bg-success'>Vous êtes enregistré !</p>)}
                { !voter || !voter.isRegistered && (<p className='bg-danger'>Vous n'êtes pas encore enregistré.</p>)}
              </Card.Body>
            </Card>
          </div>) }

          { parseInt(status) === STATUS.REG_PROPOSALS && (<div><div style={{display: 'flex', justifyContent: 'center'}}>
            <Card style={{ width: '50rem' }}>
              <Card.Header><strong>Liste des propositions</strong></Card.Header>
              <Card.Body>
                <ListGroup variant="flush">
                  <ListGroup.Item>
                    <Table striped bordered hover>
                      <thead>
                        <tr>
                          <th>Propositions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proposals !== null &&
                          proposals.map((a) => <tr><td>{a}</td></tr>)
                        }
                      </tbody>
                    </Table>
                  </ListGroup.Item>
                </ListGroup>
              </Card.Body>
            </Card>
          </div>
          <div style={{display: 'flex', justifyContent: 'center'}}>
            <Card style={{ width: '50rem' }}>
              <Card.Header><strong>Enregistrez votre proposition</strong></Card.Header>
              <Card.Body>
                <Form.Group controlId="formProposals">
                  <Form.Control type="text" id="address"
                  ref={(input) => { this.proposal = input }}
                  />
                </Form.Group>
                <Button onClick={ this.registerProposal } variant="dark" > Enregistrer </Button>
              </Card.Body>
            </Card>
          </div></div>) }

          { parseInt(status) === STATUS.END_REG && (<div style={{display: 'flex', justifyContent: 'center'}}>
            <p className="text-center text-warning">L'enregistrement des propositions est terminé. Revenez plus tard ...</p>
            <Card style={{ width: '50rem' }}>
              <Card.Header><strong>Liste des propositions</strong></Card.Header>
              <Card.Body>
                <ListGroup variant="flush">
                  <ListGroup.Item>
                    <Table striped bordered hover>
                      <thead>
                        <tr>
                          <th>Propositions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proposals !== null &&
                          proposals.map((a) => <tr><td>{a}</td></tr>)
                        }
                      </tbody>
                    </Table>
                  </ListGroup.Item>
                </ListGroup>
              </Card.Body>
            </Card>
          </div>) }

          { parseInt(status) === STATUS.VOTING && (<div><div style={{display: 'flex', justifyContent: 'center'}}>
            <Card style={{ width: '50rem' }}>
              <Card.Header><strong>Vote</strong></Card.Header>
              <Card.Body>
                <ListGroup variant="flush">
                  <ListGroup.Item>
                    <Table striped bordered hover>
                      <thead>
                        <tr>
                          <th>Candidats</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proposals !== null &&
                          proposals.map((a) => <tr key={a}><td>{a}</td></tr>)
                        }
                      </tbody>
                    </Table>
                  </ListGroup.Item>
                </ListGroup>
              </Card.Body>
            </Card>
          </div>
          <div style={{display: 'flex', justifyContent: 'center'}}>
            <Card style={{ width: '50rem' }}>
              <Card.Header><strong>Enregistrez votre vote</strong></Card.Header>
              <Card.Body>
                <Form.Group controlId="formProposals">
                  <Form.Control type="text" id="address"
                  ref={(input) => { this.vote = input }}
                  />
                </Form.Group>
                <Button onClick={ this.vote } variant="dark" > Enregistrer </Button>
              </Card.Body>
            </Card>
          </div></div>) }

          { parseInt(status) === STATUS.END_VOTING && (<div style={{display: 'flex', justifyContent: 'center'}}>
            <p className="text-center text-warning">Le vote est terminé. L'administrateur fait le décompte ...</p>
          </div>) }

      </div>
    );

  }
}

export default App;
