const Voting = artifacts.require("./Voting.sol");

contract("Voting", accounts => {
  it("...owner should register two voters.", async () => {
    const votingInstance = await Voting.deployed();

    await votingInstance.registerVoter(accounts[1], { from: accounts[0] });
    await votingInstance.registerVoter(accounts[2], { from: accounts[0] });

    let storedAddresses = await votingInstance.getAddresses();

    assert.equal(storedAddresses[0], accounts[1], "Address incorrect");
    assert.equal(storedAddresses[1], accounts[2], "Address incorrect");
  });

  it("...voter should add proposals.", async () => {
    const votingInstance = await Voting.deployed();

    await votingInstance.startProposalregistration({ from: accounts[0] });

    await votingInstance.registerProposal("Candidat 1", { from: accounts[1] });
    await votingInstance.registerProposal("Candidat 2", { from: accounts[1] });
    await votingInstance.registerProposal("Candidat 3", { from: accounts[1] });

    let storedProposals = await votingInstance.getProposals();

    assert.equal(storedProposals[0], "Candidat 1", "Proposals should be Candidat 1");
    assert.equal(storedProposals[1], "Candidat 2", "Proposals should be Candidat 2");
    assert.equal(storedProposals[2], "Candidat 3", "Proposals should be Candidat 3");

  });

});
