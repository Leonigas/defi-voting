const Voting = artifacts.require("./Voting.sol");

contract("Voting", accounts => {
  it("...owner should register two voters.", async () => {
    const votingInstance = await Voting.deployed();

    for(let i=0;i<10;i++) {
      await votingInstance.registerVoter(accounts[i], { from: accounts[0] });
    }

    let storedAddresses = await votingInstance.getAddresses();

    for(let i=0;i<10;i++) {
      assert.equal(storedAddresses[i], accounts[i], "Address incorrect");
    }
  });
  it("...voters should add proposals.", async () => {
    const votingInstance = await Voting.deployed();

    await votingInstance.startProposalregistration({ from: accounts[0] });

    for(let i=0;i<5;i++) 
      await votingInstance.registerProposal("Candidat "+i, { from: accounts[i] });

    let storedProposals = await votingInstance.getProposals();

    for(let i=0;i<5;i++) 
      assert.equal(storedProposals[i], "Candidat "+i, "Proposals should be Candidat ".i);
  });
  it("...voter should vote and increase voteCount.", async () => {
    const votingInstance = await Voting.deployed();

    await votingInstance.endProposalregistration({ from: accounts[0] });
    await votingInstance.startVotingSession({ from: accounts[0] });

    let winner = await votingInstance.getWinner();
    assert.equal(winner[0], '', "winner description incorrect");
    assert.equal(winner[1], 0, "winner id incorrect");

    for(let i=0;i<3;i++) 
      await votingInstance.vote("Candidat 1", { from: accounts[i] });

    let winner2  = await votingInstance.getWinner();
    assert.equal(winner2[0], 'Candidat 1', "winner description incorrect");
    assert.equal(winner2[1], 3, "winner vote count incorrect");

    for(let i=3;i<5;i++) 
      await votingInstance.vote("Candidat 2", { from: accounts[i] });

    let winner3  = await votingInstance.getWinner();
    assert.equal(winner3[0], 'Candidat 1', "winner description incorrect");
    assert.equal(winner3[1], 3, "winner vote count incorrect");

    for(let i=5;i<10;i++) 
      await votingInstance.vote("Candidat 4", { from: accounts[i] });

    let winner4  = await votingInstance.getWinner();
    assert.equal(winner4[0], 'Candidat 4', "winner description incorrect");
    assert.equal(winner4[1], 5, "winner vote count incorrect");
  });

});
