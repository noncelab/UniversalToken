const Web3 = require("web3");
const ABI = require("../../build/contracts/ERC1400.json").abi;
require("dotenv").config();

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.RPC_URL));
const signer = web3.eth.accounts.privateKeyToAccount(
  "0x" + process.env.PRIVATE_KEY
);

const handleError = (number) => {
  console.log(
    `유효하지 않은 인자 [${number}] (https://www.notion.so/noncelab/SC-b832d0deb6ee4431856bc10f19bf446b?pvs=4#d5ed9a382c0047d6809d82d5fd404629 참고)`
  );
};

// 인자 및 owner 사전 검증
const argumentCheck = async () => {
  // 필요한 인자가 모두 입력되었는지 확인
  if (
    process.argv.length > 3 &&
    process.argv.slice(2).every((arg) => arg && arg.length > 0)
  ) {
    // CA 주소 형식이 올바른지 / manageFunction 값이 아래 관리 코드 내에 포함되는지 확인
    if (
      !web3.utils.isAddress(process.argv[2]) ||
      ![
        "controllers",
        "isControllable",
        "setControllers",
        "controllersByPartition",
        "setPartitionControllers",
      ].includes(process.argv[3])
    ) {
      handleError(1);
      return;
    }

    let contractAddr = web3.utils.toChecksumAddress(process.argv[2]);
    let manageFunction = process.argv[3];
    let operationParamCnt = 0;
    let params = [];
    let tempOperators = [];

    // 트랜잭션 전송이 필요한 항목인 경우 controller 상태 확인 및 params 할당
    if (
      ["setControllers", "setPartitionControllers"].includes(process.argv[3])
    ) {
      // requestorAddr 주소 형식이 올바른지 확인
      if (web3.utils.isAddress(process.argv[4])) {
        // TODO: requestorAddr가 실질적 컨트랙트 owner인지 확인

        // params 배열에 requestorAddr 추가
        params.push(web3.utils.toChecksumAddress(process.argv[4]));

        if (manageFunction === "setControllers") {
          // 컨트롤러 지정
          // 숫자 인자가 필요한 항목이 숫자가 아닌 경우 확인
          if (isNaN(process.argv[5])) {
            handleError(2);
            return;
          }

          operationParamCnt = Number(process.argv[5]);

          if (process.argv[6] !== "-") {
            // 특정 함수의 인자 필요 개수만큼 돌며 params 배열 대입
            for (let i = 6; i < operationParamCnt + 6; i++) {
              // EOA 주소 형식이 올바른지 확인
              if (process.argv[i] && web3.utils.isAddress(process.argv[i])) {
                // params 배열에 operator 추가
                tempOperators.push(
                  web3.utils.toChecksumAddress(process.argv[i])
                );
              } else {
                handleError(3);
                return;
              }
            }
          }
        } else if (manageFunction === "setPartitionControllers") {
          // 파티션별 컨트롤러 지정
          params.push(web3.utils.toHex(process.argv[5]).padEnd(66, "0"));

          // 숫자 인자가 필요한 항목이 숫자가 아닌 경우 확인
          if (isNaN(process.argv[6])) {
            handleError(4);
            return;
          }

          operationParamCnt = Number(process.argv[6]);

          if (process.argv[7] !== "-") {
            // 특정 함수의 인자 필요 개수만큼 돌며 params 배열 대입
            for (let i = 7; i < operationParamCnt + 7; i++) {
              // EOA 주소 형식이 올바른지 확인
              if (process.argv[i] && web3.utils.isAddress(process.argv[i])) {
                // params 배열에 operator 추가
                tempOperators.push(
                  web3.utils.toChecksumAddress(process.argv[i])
                );
              } else {
                handleError(5);
                return;
              }
            }
          }
        }

        params.push(tempOperators);
      } else {
        handleError(6);
        return;
      }
    } else if (manageFunction === "controllersByPartition") {
      // 파티션별 컨트롤러 조회
      params.push(web3.utils.toHex(process.argv[4]).padEnd(66, "0"));
    }

    manageController(contractAddr, manageFunction, params);
  } else handleError(7);
};

// controller 관리
const manageController = async (ca, code, params) => {
  // 관리자(서명자) 정보 추가
  web3.eth.accounts.wallet.add(signer);

  const contract = new web3.eth.Contract(ABI, ca);

  // 컨트랙트 전달 값 설정
  let deployTx = "";

  if (code === "controllers") {
    // 현재 컨트롤러 리스트 조회
    deployTx = contract.methods.controllers();
  } else if (code === "isControllable") {
    // 현재 컨트롤 가능한 상태인지 확인
    deployTx = contract.methods.isControllable();
  } else if (code === "setControllers") {
    // 컨트롤러 지정
    deployTx = contract.methods.setControllers(params[1]);
  } else if (code === "controllersByPartition") {
    // 파티션별 컨트롤러 리스트 조회
    deployTx = contract.methods.controllersByPartition(params[0]);
  } else if (code === "setPartitionControllers") {
    // 파티션별 컨트롤러 지정
    deployTx = contract.methods.setPartitionControllers(params[1], params[2]);
  }

  // controller 관리 호출
  if (
    ["controllers", "isControllable", "controllersByPartition"].includes(code)
  ) {
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
