const Web3 = require("web3");
const AuthChecker = require("./AuthChecker");
require("dotenv").config();

function signAndVerify(_data, _address) {
    console.log('\tRun signAndVerify.js (address:', _address, ')');

    const authChecker = new AuthChecker(process.env.RPC_URL);

    /**
     * Request: 호출자의 프라이빗 키로 전자서명을 생성하여 주소와 함께 보냄.
     */
    const signatureObject = authChecker.sign(_data, '0x' + process.env.PRIVATE_KEY);
    console.log('\tsignature >> ', signatureObject.signature);
    //---------------------------------------------------------------------------------

    /**
     * Server: 전달받은 ① data ② signature ③ address로 verify 진행
     * 서명 데이터 검증 실패 시 403 Unauthorized 에러 반환
     */
    const result = authChecker.verify(signatureObject.message, signatureObject.signature, _address);
    
    console.assert(result, `서명 검증 실패(address: ${_address})\n`);
}

const failTest = () => {
    console.log('[Fail Test] --------------- ');
    const wrongAddr = "0xBffCaF68E3301AaAbBdDd591E86Fb014Fec2a72F";
    const dataInJson = { a: 'a', b: 'b', c: 'c'};
    signAndVerify(JSON.stringify(dataInJson), wrongAddr);
}

const passTest = () => {
    console.log('[Pass Test] --------------- ');
    const web3 = new Web3(new Web3.providers.HttpProvider(process.env.RPC_URL));
    const addr = web3.eth.accounts.privateKeyToAccount(
        "0x" + process.env.PRIVATE_KEY
    );
    const dataInJson = { a: 'a', b: 'b', c: 'c'};
    signAndVerify(JSON.stringify(dataInJson), addr.address);
}

const runTest = () => {
    failTest();
    passTest();
}

/**
 * UniversalToken$ node ./test/task/signAndVerify.js
 *  */ 
runTest();

