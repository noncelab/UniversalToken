const Web3 = require("web3");
require("dotenv").config();

const web3 = new Web3(
    // "http://localhost:7545"
    // new Web3.providers.HttpProvider("https://rpc.ssafy-blockchain.com")
    new Web3.providers.HttpProvider("http://localhost:7545")
  );

// 
const sign = (data, privateKey) => web3.eth.accounts.sign(data, privateKey);

// returns ethereum address
const verify = (message, signature) => web3.eth.accounts.recover(message, signature);

function runTest() {
    // Client-Side
    // 1. 파라미터 스트링을 프라이빗키로 sign함
    // (서버에서 어떤 data로 서명했는지 확인하기 위해 약속이 필요함)
    const data = "parameter data in JsonString";
    const signatureObject = sign(data, '0x' + process.env.PRIVATE_KEY);
    console.log('signature >> ', signatureObject.signature);
    
    // 서명 생성한 프라이빗 키로부터 추출한 주소 
    const signer = web3.eth.accounts.privateKeyToAccount(
        "0x" + process.env.PRIVATE_KEY
    ); 
    // 임의의 주소
    const wrongAddress = "0xBffCaF68E3301AaAbBdDd591E86Fb014Fec2a72F";
    // 2. signature를 생성한 주소, signature, data를 백엔드로 전달

    // Server-Side
    // 1. 전달받은 
    //    ① data(signatureObject.message)
    //    ② signature
    //    로 verify 진행.
    // 2. 전달받은 주소와 1.의 결과가 같은지 확인
    // 3.1. 같으면 요청을 진행함.
    // 3.2. 같지 않으면 403 Unauthorized 에러를 반환함.
    const address = verify(signatureObject.message, signatureObject.signature);
    
    console.assert(address === signer.address, { address, errorMsg: '서명 검증 실패' });
    console.assert(address === wrongAddress, `서명 검증 실패(address: ${wrongAddress})`);
}

runTest();
