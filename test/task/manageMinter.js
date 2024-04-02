const Web3 = require("web3");
const ABI = require("../../build/contracts/ERC1400.json").abi;
require("dotenv").config();

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.RPC_URL));

// 에러 출력
const errorConsole = () => {
  console.log(
    "##################################################################################################################################################"
  );
  console.log(
    "#                                                           올바르지 않은 인자가 있습니다.                                                       #"
  );
  console.log(
    "##################################################################################################################################################"
  );
  console.log(
    "[사용법] node ./test/task/manageMinter.js contractAddr requestorAddr manageFunction\n"
  );
  console.log(
    "* contractAddr: 특정 ERC-1400 컨트랙트 주소\n* requestorAddr: 배포 요청자 주소\n* manageFunction: minter 관리 기능명 (isMinter, addMinter, removeMinter)\n"
  );
  console.log(
    "** 예시 1 (0x01bBd9086b5EEe322F787bDBD29Dc51D9931552C 컨트랙트에 0x8448967beb39174b94a96dfa9eff5ffa3af2c4bc 주소가 minter로 지정되어 있는지 확인)\n: node ./test/task/manageMinter.js 0x01bBd9086b5EEe322F787bDBD29Dc51D9931552C 0x8448967beb39174b94a96dfa9eff5ffa3af2c4bc isMinter\n"
  );
  console.log(
    "** 예시 2 (0x01bBd9086b5EEe322F787bDBD29Dc51D9931552C 컨트랙트에 0x8448967beb39174b94a96dfa9eff5ffa3af2c4bc 주소를 minter로 추가)\n: node ./test/task/manageMinter.js 0x01bBd9086b5EEe322F787bDBD29Dc51D9931552C 0x8448967beb39174b94a96dfa9eff5ffa3af2c4bc addMinter"
  );
  console.log(
    "##################################################################################################################################################"
  );
};

// 인자 사전 검증
const argumentCheck = () => {
  // 필요한 인자가 모두 입력되었는지 확인
  if (
    process.argv.length > 4 &&
    process.argv.slice(2).every((arg) => arg && arg.length > 0)
  ) {
    // CA 또는 EOA 주소 형식이 올바른지 / manageFunction 값이 아래 관리 코드 내에 포함되는지 확인
    if (
      !web3.utils.isAddress(process.argv[2]) ||
      !web3.utils.isAddress(process.argv[3]) ||
      !["isMinter", "addMinter", "removeMinter"].includes(process.argv[4])
    ) {
      errorConsole();
      return;
    }

    let contractAddr = process.argv[2];
    let requestorAddr = process.argv[3];
    let manageFunction = process.argv[4];

    manageMinter(contractAddr, requestorAddr, manageFunction);
  } else errorConsole();
};

// minter 관리
const manageMinter = async (ca, eoa, code) => {
  const signer = web3.eth.accounts.privateKeyToAccount(
    "0x" + process.env.PRIVATE_KEY
  );

  // 관리자(서명자) 정보 추가
  web3.eth.accounts.wallet.add(signer);

  const contract = new web3.eth.Contract(ABI, ca);

  // 컨트랙트 전달 값 설정
  let deployTx = "";

  if (code === "isMinter") {
    // minter인지 확인
    deployTx = contract.methods.isMinter(eoa);
  } else if (code === "addMinter") {
    // 특정 주소 minter 권한 추가
    deployTx = contract.methods.addMinter(eoa);
  } else if (code === "removeMinter") {
    // 특정 주소 minter 권한 제거
    deployTx = contract.methods.removeMinter(eoa);
  }

  // minter 관리 호출
  if (code === "isMinter") {
    // 단순 조회
    const result = await deployTx.call();

    console.log("Result:", result);
  } else {
    // 트랜잭션 전송
    await deployTx
      .send({
        from: signer.address,
        gas: await deployTx.estimateGas({ from: signer.address }),
      })
      .once("transactionHash", (txHash) => {
        console.log("TxHash:", txHash);
      })
      .once("receipt", (result) => {
        console.log("Result:", result);
      });
  }
};

argumentCheck();
