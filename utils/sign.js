const ethers = require('ethers');
const fs = require('fs');

let ORACLE_PRIVATE = 'leopard despair pencil vacant matter mercy life news spend explain mixture situate';

// '0xD017B23c35b4B8c02CD69A16E938bEc2a88d4a7d'




async function sign(_recipient, _date, _amount) {
    const signer = new ethers.Wallet.fromMnemonic(ORACLE_PRIVATE);
    let hash = ethers.utils.solidityKeccak256(
        ['address', 'string', 'uint256', 'string', 'uint256'],
        [_recipient, '-', _date, '-', _amount]
    );
    // address _recipient, uint256 _amount, bytes calldata signature
    return await signer.signMessage(ethers.utils.arrayify(hash));
}

module.exports.sign = sign;
