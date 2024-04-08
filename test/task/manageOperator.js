/**
 * Operator 관리를 위한 스크립트 파일
 * @dev isOperator, isOperatorForPartition 함수 호출로 컨트랙트 상호 작용 가능
 * @command node ./test/task/manageOperator.js contractAddr manageFunction [함수별 파라미터]
 * @see 관련 문서: https://www.notion.so/noncelab/SC-b832d0deb6ee4431856bc10f19bf446b?pvs=4#d7cfe39dd6714705b45a4543f540a4ba
 */

const Web3 = require("web3");
const ABI = require("../../build/contracts/ERC1400.json").abi;
require("dotenv").config();

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.RPC_URL));

const handleError = (number) => {
  console.log(
    `Invalid arguments [${number}] (Refer to https://www.notion.so/noncelab/SC-b832d0deb6ee4431856bc10f19bf446b?pvs=4#d7cfe39dd6714705b45a4543f540a4ba)`
  );
};

// 인자 사전 검증
const argumentCheck = () => {
  // 필요한 인자가 모두 입력되었는지 확인
  if (
    process.argv.length > 4 &&
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
      handleError(1);
      return;
    }

    let contractAddr = web3.utils.toChecksumAddress(process.argv[2]);
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
        handleError(2);
        return;
      }
    }

    manageOperator(contractAddr, manageFunction, params);
  } else handleError(3);
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
  let tx = "";

  if (code === "isOperator") {
    // 특정 tokenHolder의 operator인지 확인
    tx = contract.methods.isOperator(
      web3.utils.toChecksumAddress(params[0]), // operator
      web3.utils.toChecksumAddress(params[1]) // tokenHolder
    );
  } else if (code === "isOperatorForPartition") {
    // 특정 파티션 내 tokenHolder의 operator인지 확인
    tx = contract.methods.isOperatorForPartition(
      params[0], // partition
      web3.utils.toChecksumAddress(params[1]), // operator
      web3.utils.toChecksumAddress(params[2]) // tokenHolder
    );
  }
  // else if (code === "authorizeOperator") {
  //   // 특정 주소를 operator로 추가
  //   tx = contract.methods.authorizeOperator(
  //     web3.utils.toChecksumAddress(params[0]) // operator
  //   );
  // } else if (code === "revokeOperator") {
  //   // 특정 주소의 operator 권한 제거
  //   tx = contract.methods.revokeOperator(
  //     web3.utils.toChecksumAddress(params[0]) // operator
  //   );
  // } else if (code === "authorizeOperatorByPartition") {
  //   // 특정 주소를 특정 파티션의 operator로 추가
  //   tx = contract.methods.authorizeOperatorByPartition(
  //     params[0], // partition
  //     web3.utils.toChecksumAddress(params[1]) // operator
  //   );
  // } else if (code === "revokeOperatorByPartition") {
  //   // 특정 주소를 특정 파티션의 operator에서 권한 제거
  //   tx = contract.methods.revokeOperatorByPartition(
  //     params[0], // partition
  //     web3.utils.toChecksumAddress(params[1]) // operator
  //   );
  // }

  // operator 관리 호출
  if (["isOperator", "isOperatorForPartition"].includes(code)) {
    // 단순 조회
    const result = await tx.call();

    console.log("Result:", result);
    return result;
  }
  // else {
  //   // 트랜잭션 전송
  //   await tx
  //     .send({
  //       from: signer.address,
  //       gas: await tx.estimateGas({ from: signer.address }),
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
