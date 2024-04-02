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
    "[사용법] node ./test/task/manageOperator.js contractAddr manageFunction [함수별 파라미터]\n"
  );
  console.log(
    "* contractAddr: 특정 ERC-1400 컨트랙트 주소\n* manageFunction: 특정 ERC-1400 컨트랙트 주소\n* [함수별 파라미터]: 함수별로 필요한 인자를 순서대로 나열 (띄어쓰기로 구분)\n"
  );
  console.log("[manageFunction별 파라미터 순서]");
  console.log(
    "* isOperator: operator tokenHolder\n* authorizeOperator: operator\n* revokeOperator: operator\n* isOperatorForPartition: partition operator tokenHolder\n* authorizeOperatorByPartition: partition operator\n* revokeOperatorByPartition: partition operator\n"
  );
  console.log(
    "** 예시 1 (0x01bBd9086b5EEe322F787bDBD29Dc51D9931552C 주소의 operator가 0x8448967beb39174b94a96dfa9eff5ffa3af2c4bc인지 확인)\n: node ./test/task/manageOperator.js 0x01bBd9086b5EEe322F787bDBD29Dc51D9931552C isOperator 0x8448967beb39174b94a96dfa9eff5ffa3af2c4bc 0x01bBd9086b5EEe322F787bDBD29Dc51D9931552C\n"
  );
  console.log(
    "** 예시 2 (0x01bBd9086b5EEe322F787bDBD29Dc51D9931552C 주소의 0x7265736572766564000000000000000000000000000000000000000000000000 파티션 operator가 0x8448967beb39174b94a96dfa9eff5ffa3af2c4bc인지 확인)\n: node ./test/task/manageOperator.js 0x01bBd9086b5EEe322F787bDBD29Dc51D9931552C isOperatorForPartition 0x7265736572766564000000000000000000000000000000000000000000000000 0x8448967beb39174b94a96dfa9eff5ffa3af2c4bc 0x01bBd9086b5EEe322F787bDBD29Dc51D9931552C"
  );
  console.log(
    "##################################################################################################################################################"
  );
};

// 인자 사전 검증
const argumentCheck = () => {
  // 필요한 인자가 모두 입력되었는지 확인
  if (
    process.argv.length > 2 &&
    process.argv.slice(2).every((arg) => arg && arg.length > 0)
  ) {
    // CA 주소 형식이 올바른지 / manageFunction 값이 아래 관리 코드 내에 포함되는지 확인
    if (
      !web3.utils.isAddress(process.argv[2]) ||
      ![
        "isOperator",
        "isOperatorForPartition",
        // "authorizeOperator",
        // "revokeOperator",
        // "authorizeOperatorByPartition",
        // "revokeOperatorByPartition",
      ].includes(process.argv[3])
    ) {
      errorConsole();
      return;
    }

    let contractAddr = process.argv[2];
    let manageFunction = process.argv[3];
    let operationParamCnt;

    switch (manageFunction) {
      // case "authorizeOperator" || "revokeOperator":
      //   operationParamCnt = 1;
      //   break;
      case "isOperator":
        // ||
        //   "authorizeOperatorByPartition" ||
        //   "revokeOperatorByPartition":
        operationParamCnt = 2;
        break;
      case "isOperatorForPartition":
        operationParamCnt = 3;
        break;
      default:
        operationParamCnt = 0;
    }

    let params = [];

    // 특정 함수의 인자 필요 개수만큼 돌며 params 배열 대입
    for (let i = 4; i < operationParamCnt + 4; i++) {
      if (process.argv[i]) params.push(process.argv[i]);
      else {
        errorConsole();
        return;
      }
    }

    manageOperator(contractAddr, manageFunction, params);
  } else errorConsole();
};

// operator 관리
const manageOperator = async (ca, code, params) => {
  const signer = web3.eth.accounts.privateKeyToAccount(
    "0x" + process.env.PRIVATE_KEY
  );

  // 관리자(서명자) 정보 추가
  web3.eth.accounts.wallet.add(signer);

  const contract = new web3.eth.Contract(ABI, ca);

  // 컨트랙트 전달 값 설정
  let deployTx = "";

  if (code === "isOperator") {
    // 특정 tokenHolder의 operator인지 확인
    deployTx = contract.methods.isOperator(params[0], params[1]);
  } else if (code === "isOperatorForPartition") {
    // 특정 파티션 내 tokenHolder의 operator인지 확인
    deployTx = contract.methods.isOperatorForPartition(
      params[0],
      params[1],
      params[2]
    );
  }
  // else if (code === "authorizeOperator") {
  //   // 특정 주소를 operator로 추가
  //   deployTx = contract.methods.authorizeOperator(params[0]);
  // } else if (code === "revokeOperator") {
  //   // 특정 주소의 operator 권한 제거
  //   deployTx = contract.methods.revokeOperator(params[0]);
  // } else if (code === "authorizeOperatorByPartition") {
  //   // 특정 주소를 특정 파티션의 operator로 추가
  //   deployTx = contract.methods.authorizeOperatorByPartition(
  //     params[0],
  //     params[1]
  //   );
  // } else if (code === "revokeOperatorByPartition") {
  //   // 특정 주소를 특정 파티션의 operator에서 권한 제거
  //   deployTx = contract.methods.revokeOperatorByPartition(params[0], params[1]);
  // }

  // operator 관리 호출
  if (["isOperator", "isOperatorForPartition"].includes(code)) {
    // 단순 조회
    const result = await deployTx.call();

    console.log("Result:", result);
  }
  // else {
  //   // 트랜잭션 전송
  //   await deployTx
  //     .send({
  //       from: signer.address,
  //       gas: await deployTx.estimateGas({ from: signer.address }),
  //     })
  //     .once("transactionHash", (txHash) => {
  //       console.log("TxHash:", txHash);
  //     })
  //     .once("receipt", (result) => {
  //       console.log("Result:", result);
  //     });
  // }
};

argumentCheck();
