const Web3 = require("web3");

class AuthChecker {
    constructor(providerUrl) {
        this.web3 = new Web3(new Web3.providers.HttpProvider(providerUrl));
    }

    sign(data, privateKey) {
        return this.web3.eth.accounts.sign(data, privateKey);
    }

    verify(message, signature, address) {
        const fetchedAddress = this.web3.eth.accounts.recover(message, signature);
        return this.web3.utils.toChecksumAddress(address) === 
            this.web3.utils.toChecksumAddress(fetchedAddress);
    }
}
  
module.exports = AuthChecker;