// contracts/GameItem.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
import "@openzeppelin/contracts/access/Ownable.sol";
pragma experimental ABIEncoderV2;

contract Voting is Ownable {
    enum WorkflowStatus {
        RegisteringVoters,
        ProposalsRegistrationStarted,
        ProposalsRegistrationEnded,
        VotingSessionStarted,
        VotingSessionEnded,
        VotesTallied
    }
    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint votedProposalId;
    }
    struct Proposal {
        string description;
        uint voteCount;
    }
    mapping (uint => Proposal) public _proposals;
    mapping (address => Voter) public _voters;
    address[] public addresses; // TODO remove this (only DEBUG)
    uint[] _proposalIds;
    uint public winningProposalId;
    uint private nonce = 0;
    WorkflowStatus public status = WorkflowStatus.RegisteringVoters;

    event RegisteringVotersStarted();
    event VoterRegistered(address voterAddress);
    event ProposalsRegistrationStarted();
    event ProposalsRegistrationEnded();
    event ProposalRegistered(uint proposalId);
    event VotingSessionStarted();
    event VotingSessionEnded();
    event Voted (address voter, uint proposalId);
    event VotesTallied();
    event WorkflowStatusChange(WorkflowStatus previousStatus, WorkflowStatus newStatus);

    function random() internal returns (uint) {
        nonce++;
        return uint(keccak256(abi.encodePacked(block.timestamp, msg.sender, nonce))) % 100;
    }
    
    function getProposalIdFromDescription(string memory _description) external view returns (uint) {
        uint id = 0;
        for(uint i=0; i<_proposalIds.length; i++) {
            if (keccak256(abi.encodePacked(_proposals[_proposalIds[i]].description)) == keccak256(abi.encodePacked(_description))) {
                id = _proposalIds[i];
                break;
            }
        }
        return id;
    }
    
    // TODO remove this (only DEBUG)
    function getAddresses() external view returns(address[] memory){
        return addresses;
    }

        // TODO remove this (only DEBUG)
    // function getAddressesWhoHasVoted() external view returns(address[] memory){
    //     return addresses;
    // }


    // TODO getVoters(address) qui return un voter

    function getProposals() external view returns(string[] memory){
        string[] memory arrayProposals = new string[](_proposalIds.length);
        for(uint i=0; i<_proposalIds.length; i++) {
            arrayProposals[i] = _proposals[_proposalIds[i]].description;
        }        
        return arrayProposals;
    }

    function getWinner() external view returns(string memory) {
        return _proposals[winningProposalId].description;
    }

    // function getWinner() external view returns(string memory) {
    //     // require(winningProposalId != 0, "Error, there is no winner or the vote is not ended.");
    //     return _proposals[winningProposalId].description;
    // }

    function getWinnerVoteCount() external view returns(uint) {
        // require(winningProposalId != 0, "Error, there is no winner or the vote is not ended.");
        return _proposals[winningProposalId].voteCount;
    }

    function tally() external onlyOwner {
        require(status == WorkflowStatus.VotingSessionEnded, "Wait, this is not the time to tally !");
        require(status != WorkflowStatus.VotesTallied, "Vote already tallied.");
        
        uint max = 0;
        for(uint i=0; i<_proposalIds.length; i++) {
            if (_proposals[_proposalIds[i]].voteCount > max) {
                max = _proposals[i].voteCount;
                winningProposalId = _proposalIds[i];
            }
        }

        WorkflowStatus previousStatus = status;
        status = WorkflowStatus.VotesTallied;
        emit WorkflowStatusChange(previousStatus, status);
        emit VotesTallied();   
    }
    
    function vote(string memory _description) external {
        require(status == WorkflowStatus.VotingSessionStarted, "This is not yet the time to vote !");
        require(_voters[msg.sender].isRegistered, "You must be registered to vote !");
        require(!_voters[msg.sender].hasVoted, "You thought you could vote twice ? Nice try ...");

        uint propId = this.getProposalIdFromDescription(_description);
        require(propId > 0, "Proposal Not Found !");

        _proposals[propId].voteCount++;  
        _voters[msg.sender].hasVoted = true;
        _voters[msg.sender].votedProposalId = propId;
        
        emit Voted(msg.sender, propId);
    }
    
    function registerVoter(address _address) external onlyOwner {
        require(status == WorkflowStatus.RegisteringVoters, "This is not the time for voter registration !");
        require(!_voters[_address].isRegistered, "This voter is already registered !");
        Voter memory voter;
        voter.isRegistered = true;
        voter.hasVoted = false;
        _voters[_address] = voter;
        addresses.push(_address); // TODO remove this (only DEBUG)
        emit VoterRegistered(_address);
    }
    
    function registerProposal(string memory _description) external {
        require(status == WorkflowStatus.ProposalsRegistrationStarted, "This is not the time for proposal registration !");
        require(_voters[msg.sender].isRegistered, "You must be registered to send a proposal.");

        uint alreadyExistId = this.getProposalIdFromDescription(_description);
        require(alreadyExistId == 0, "Proposal already exist !");

        Proposal memory proposal;
        proposal.description = _description;
        proposal.voteCount = 0;
        
        uint proposalId = random();
        _proposals[proposalId] = proposal;
        _proposalIds.push(proposalId);
        
        emit ProposalRegistered(proposalId);
    }
    
    function startVotersregistration() external onlyOwner {
        require(status != WorkflowStatus.RegisteringVoters, "Registration already started");
        WorkflowStatus previousStatus = status;
        status = WorkflowStatus.RegisteringVoters;
        emit WorkflowStatusChange(previousStatus, status);
        emit RegisteringVotersStarted();
    }

    function startProposalregistration() external onlyOwner {
        require(status != WorkflowStatus.ProposalsRegistrationStarted, "Registration already started");
        require(status == WorkflowStatus.RegisteringVoters, "You can only register proposals after voter registration");
        WorkflowStatus previousStatus = status;
        status = WorkflowStatus.ProposalsRegistrationStarted;
        emit WorkflowStatusChange(previousStatus, status);
        emit ProposalsRegistrationStarted();
    }
        
    function endProposalregistration() external onlyOwner {
        require(status == WorkflowStatus.ProposalsRegistrationStarted, "Registration is not started !");
        WorkflowStatus previousStatus = status;
        status = WorkflowStatus.ProposalsRegistrationEnded;
        emit WorkflowStatusChange(previousStatus, status);
        emit ProposalsRegistrationEnded();
    }
    
    function startVotingSession() external onlyOwner {
        require(status != WorkflowStatus.VotingSessionStarted, "Voting session already started");
        require(status == WorkflowStatus.ProposalsRegistrationEnded, "You can only vote after proposal registration ended");
        WorkflowStatus previousStatus = status;
        status = WorkflowStatus.VotingSessionStarted;
        emit WorkflowStatusChange(previousStatus, status);
        emit VotingSessionStarted();
    }
        
    function endVotingSession() external onlyOwner {
        require(status == WorkflowStatus.VotingSessionStarted, "Voting session is not started !");
        WorkflowStatus previousStatus = status;
        status = WorkflowStatus.VotingSessionEnded;
        emit WorkflowStatusChange(previousStatus, status);
        emit VotingSessionEnded();
    }

}