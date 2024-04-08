/**
 * Controller 관리를 위한 스크립트 파일
 * @dev controllers, setControllers, controllersByPartition, setPartitionControllers 함수 호출로 컨트랙트 상호 작용 가능
 * @command node ./test/task/manageController.js contractAddr manageFunction [함수별 파라미터]
 * @see 관련 문서: https://www.notion.so/noncelab/SC-b832d0deb6ee4431856bc10f19bf446b?pvs=4#d5ed9a382c0047d6809d82d5fd404629
 */

const Web3 = require("web3");
const ABI = require("../../build/contracts/ERC1400.json").abi;
require("dotenv").config();

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.RPC_URL));
const signer = web3.eth.accounts.privateKeyToAccount(
  "0x" + process.env.PRIVATE_KEY
);

const handleError = (number) => {
  console.log(
    `Invalid arguments [${number}] (Refer to https://www.notion.so/noncelab/SC-b832d0deb6ee4431856bc10f19bf446b?pvs=4#d5ed9a382c0047d6809d82d5fd404629)`
  );
};

// 인자 및 isOwner 사전 검증
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
      ["setControllers", "setPartitionControllers"].includes(manageFunction)
    ) {
      let requestorAddr = process.argv[4];

      // requestorAddr 주소 형식이 올바른지 확인
      if (web3.utils.isAddress(requestorAddr)) {
        // TODO: requestorAddr가 실질적 컨트랙트 owner인지 확인 필요
        // 컨트랙트 상으로는 onlyOwner인 경우에만 해당 기능을 수행할 수 있으며,
        // 이 스크립트에서는 함수 호출자가 isMinter 및 isController인지 확인하는 정도로 사전 검증함
        // DB에 저장된 실질적 컨트랙트 owner도 확인 필요
        web3.eth.accounts.wallet.add(signer);

        // requestorAddr가 minter 또는 controller인지 확인
        const contract = new web3.eth.Contract(ABI, contractAddr);
        const minterResult = await contract.methods
          .isMinter(web3.utils.toChecksumAddress(requestorAddr))
          .call();
        const controllerResult = await contract.methods.controllers().call();

        if (
          !minterResult ||
          !controllerResult ||
          !controllerResult.includes(
            web3.utils.toChecksumAddress(requestorAddr)
          )
        ) {
          console.log(
            `Error: requestorAddr ${requestorAddr} is neither minter nor controller`
          );
          return;
        }

        if (manageFunction === "setControllers") {
          // controller 지정
          // 숫자 인자가 필요한 항목이 숫자가 아닌 경우 확인
          if (isNaN(process.argv[5])) {
            handleError(2);
            return;
          }

          operationParamCnt = Number(process.argv[5]);

          if (process.argv[6] !== "-") {
            // 특정 함수의 인자 필요 개수만큼 돌며 tempOperators 배열 대입
            for (let i = 6; i < operationParamCnt + 6; i++) {
              // EOA 주소 형식이 올바른지 확인
              if (process.argv[i] && web3.utils.isAddress(process.argv[i])) {
                // tempOperators 배열에 operator 추가
                tempOperators.push(
                  web3.utils.toChecksumAddress(process.argv[i])
                );
              } else {
                handleError(3);
                return;
              }
            }
          }

          // controller에 시스템 owner의 주소가 빠져있는 경우 강제 추가
          if (!tempOperators.includes(signer.address))
            tempOperators.push(signer.address);
        } else if (manageFunction === "setPartitionControllers") {
          // 파티션별 controller 지정
          if (process.argv[5])
            params.push(web3.utils.toHex(process.argv[5]).padEnd(66, "0"));
          else {
            handleError(4);
            return;
          }

          // 숫자 인자가 필요한 항목이 숫자가 아닌 경우 확인
          if (isNaN(process.argv[6])) {
            handleError(5);
            return;
          }

          operationParamCnt = Number(process.argv[6]);

          if (process.argv[7] !== "-") {
            // 특정 함수의 인자 필요 개수만큼 돌며 tempOperators 배열 대입
            for (let i = 7; i < operationParamCnt + 7; i++) {
              // EOA 주소 형식이 올바른지 확인
              if (process.argv[i] && web3.utils.isAddress(process.argv[i])) {
                // tempOperators 배열에 operator 추가
                tempOperators.push(
                  web3.utils.toChecksumAddress(process.argv[i])
                );
              } else {
                handleError(6);
                return;
              }
            }
          }
        }

        params.push(tempOperators);
      } else {
        handleError(7);
        return;
      }
    } else if (manageFunction === "controllersByPartition") {
      // 파티션별 controller 조회
      if (process.argv[4])
        params.push(web3.utils.toHex(process.argv[4]).padEnd(66, "0"));
      else {
        handleError(8);
        return;
      }
    }

    return {
      contractAddr,
      manageFunction,
      params,
    };
  } else handleError(9);
};

// controller 관리
const manageController = async (ca, code, params) => {
  // 관리자(서명자) 정보 추가
  web3.eth.accounts.wallet.add(signer);

  const contract = new web3.eth.Contract(ABI, ca);

  // 컨트랙트 전달 값 설정
  let tx = "";

  if (code === "controllers") {
    // 현재 controller 리스트 조회
    tx = contract.methods.controllers();
  } else if (code === "setControllers") {
    // controller 지정
    tx = contract.methods.setControllers(params[0]); // operators[]
  } else if (code === "controllersByPartition") {
    // 파티션별 controller 리스트 조회
    tx = contract.methods.controllersByPartition(params[0]); // partition
  } else if (code === "setPartitionControllers") {
    // 파티션별 controller 지정
    tx = contract.methods.setPartitionControllers(params[0], params[1]); // partition operators[]
  }

  // controller 관리 호출
  if (["controllers", "controllersByPartition"].includes(code)) {
    // 단순 조회
    const result = await tx.call();

    console.log("Result:", result);

    return result;
  } else {
    // 트랜잭션 전송
    await tx
      .send({
        from: signer.address,
        gas: await tx.estimateGas({ from: signer.address }),
      })
      .once("transactionHash", (txHash) => {
        console.log("TxHash:", txHash);
      })
      .once("receipt", (result) => {
        console.log("Result:", result);

        return result;
      });
  }
};

const test = async () => {
  const parameterObject = await argumentCheck();

  if (parameterObject) {
    console.log(`Trying to call/send ${parameterObject.manageFunction}...`);

    await manageController(
      parameterObject.contractAddr,
      parameterObject.manageFunction,
      parameterObject.params
    );
  }
};

test();
