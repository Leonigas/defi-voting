import React, { Component } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';
import VotingContract from "./contracts/Voting.json";
import getWeb3 from "./getWeb3";
import ListProposals from "./components/ListProposals";
import ListVoters from "./components/ListVoters";
import Winner from "./components/Winner";

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
    { name: "Enregistrement des électeurs", color: "primary" },
    { name: "Enregistrement des propositions", color: "secondary" },
    { name: "Fin des propositions", color: "dark" },
    { name: "Début du vote", color: "info" },
    { name: "Fin du vote", color: "light" },
    { name: "Décompte fait", color: "success" }
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
  updateVoters = async () => {
    const { accounts, contract } = this.state;
    const voter = await contract.methods._voters(accounts[0]).call()
    const voters = await contract.methods.getAddresses().call()
    this.setState({ voter: voter, voters: voters })
  }

  /**
   * Met à jour les propositions après l'évènement ProposalRegistered 
   */
  updateProposals = async () => {
    const { contract } = this.state;
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

  updateWinner = async () => {
    const { contract } = this.state;

    const winningProposalId = await contract.methods.winningProposalId().call();  
    const winner = await contract.methods.getWinner().call();

    console.log(winner)

    this.setState({  winningProposalId: winningProposalId, winner:winner })
  }

  runInit = async () => {
    const { contract } = this.state;

    // enregistrement des évènements
    contract.events.VoterRegistered().on('data', (event) => this.updateVoters(event)).on('error', console.error);
    contract.events.ProposalRegistered().on('data', (event) => this.updateProposals(event)).on('error', console.error);
    contract.events.WorkflowStatusChange().on('data', (event) => this.updateStatus(event)).on('error', console.error);
    contract.events.VotesTallied().on('data', (event) => this.updateWinner(event)).on('error', console.error);

    this.updateStatus() // met à jour le status
    this.updateVoters() // liste des votants et status du votant
    this.updateProposals() // liste des propositions
    this.updateWinner() // informations sur le gagnant

    // données personnelles
    const ownerAddress = await contract.methods.owner().call()

    // Mettre à jour le state 
    this.setState({ ownerAddress: ownerAddress })  
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
    const vote = this.vote_choice.value;

    await contract.methods.vote(vote).send({from: accounts[0]});
    
    // Vide le champs input proposal
    this.vote.value = null;
  }

  tally = async () => {
    const { accounts, contract } = this.state;
    await contract.methods.tally().send({from: accounts[0]});
  }

  nextStatus = async() => {
    const { accounts, contract, status } = this.state;

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
  }

  render() {
    const { accounts, status, voters, statusColor, statusName, ownerAddress, voter, proposals, winner } = this.state;

    if (accounts && accounts[0] === ownerAddress) {
      return (
        <div className="App">
          <div className={"alert alert-" + statusColor +" fade show"}>
            { statusName }
          </div>

          <div>
              <h2 className="text-center">Système de vote</h2>
              <hr></hr>
              <br></br>
          </div>

          <div>
          { parseInt(status) !== STATUS.TALLY && (
              <button type="button" class="btn btn-primary" onClick={ this.nextStatus } variant="light" > Suivant </button>)}
          </div>
          
          <br></br>

          <ListVoters voters= {voters}></ListVoters>
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

          { (parseInt(status) === STATUS.REG_PROPOSALS || parseInt(status) === STATUS.VOTING || parseInt(status) === STATUS.END_REG) && proposals && (<div>
            <ListProposals proposals={proposals}></ListProposals>
          </div>) }

          { parseInt(status) === STATUS.END_VOTING && (<div>
          <div style={{display: 'flex', justifyContent: 'center'}}>
            <Card style={{ width: '50rem' }}>
              <Card.Header><strong>Action</strong></Card.Header>
              <Card.Body>
                <Button onClick={ this.tally } variant="dark" > Faire le décompte ! </Button>
              </Card.Body>
            </Card>
          </div></div>) }

          { parseInt(status) === STATUS.TALLY && winner && (<Winner winner={winner}></Winner>) }
          <br></br>
        </div>
      );
    }

    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }

    return (
      <div className="App">
          <div className={"alert alert-" + statusColor +" fade show"}>
          { statusName }
        </div>

        <div>
          <h2 className="text-center">Système de vote</h2>
          <hr></hr>
          <br></br>
        </div>

        { parseInt(status) === STATUS.REG_VOTERS && (<div>
            <div className="alert alert-info alert-dismissible fade show" role="alert">L'administrateur est en train d'enregister les électeurs. Revenez plus tard ...</div>
            <div style={{display: 'flex', justifyContent: 'center'}}>
              <Card style={{ width: '50rem' }}>
                <Card.Header><strong>Entregistrement</strong></Card.Header>
                <Card.Body>
                  { voter && voter.isRegistered && (<p className='alert alert-success'>Vous êtes enregistré !</p>)}
                  { (!voter || !voter.isRegistered) && (<p className='alert alert-danger'>Vous n'êtes pas encore enregistré.</p>)}
                </Card.Body>
              </Card>
          </div></div>) }

          { parseInt(status) === STATUS.REG_PROPOSALS && proposals && (<div>
            { <ListProposals proposals={proposals}></ListProposals> }
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

          { parseInt(status) === STATUS.END_REG  && proposals && (<div>
            <div className="alert alert-info alert-dismissible fade show" role="alert">L'enregistrement des propositions est terminé. Revenez plus tard ...</div>
            <ListProposals proposals={proposals}></ListProposals>
          </div>)}

          { parseInt(status) === STATUS.VOTING && proposals && (<div>
            <ListProposals proposals={proposals}></ListProposals>
            <div style={{display: 'flex', justifyContent: 'center'}}>
              <Card style={{ width: '50rem' }}>
                <Card.Header><strong>Enregistrez votre vote</strong></Card.Header>
                <Card.Body>
                  <Form.Group controlId="formProposals">
                    <Form.Control type="text" id="address"
                    ref={(input) => { this.vote_choice = input }}
                    />
                  </Form.Group>
                  <Button onClick={ this.vote } variant="dark" > Enregistrer </Button>
                </Card.Body>
              </Card>
            </div></div>)}

          { parseInt(status) === STATUS.END_VOTING && (<div style={{display: 'flex', justifyContent: 'center'}}>
            <div className="alert alert-success alert-dismissible fade show" role="alert">Le vote est terminé ! L'administrateur fait le décompte ...</div>
          </div>) }

          { parseInt(status) === STATUS.TALLY && winner && (<Winner winner={winner}></Winner>) }
      </div>
    );

  }
}

export default App;
