/**
 * DefaultPartition 관리를 위한 스크립트 파일
 * @brief getDefaultPartitions, setDefaultPartitions 함수 호출로 컨트랙트 상호 작용 가능
 * @command node ./test/task/defaultPartition.js contractAddr manageFunction [함수별 파라미터]
 * @see 관련 문서: https://www.notion.so/noncelab/SC-setDefaultPartitions-59806abe66164d9eac22ebf8db244f96?pvs=4#9c3e2beb9ee745b4a231425cb553d5e1
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
    `Invalid arguments [${number}] (Refer to https://www.notion.so/noncelab/SC-setDefaultPartitions-59806abe66164d9eac22ebf8db244f96?pvs=4#9c3e2beb9ee745b4a231425cb553d5e1)`
  );
};

// 인자 및 isOwner 사전 검증
const argumentCheck = async () => {
  // 필요한 인자가 모두 입력되었는지 확인
  if (
    process.argv.length > 3 &&
    process.argv.slice(2).every((arg) => arg && arg.length > 0)
  ) {
    // CA 주소 형식이 올바른지 확인
    if (web3.utils.isAddress(process.argv[2])) {
      let contractAddr = web3.utils.toChecksumAddress(process.argv[2]);
      let manageFunction = process.argv[3];
      let operationParamCnt = 0;
      let partitions = [];

      // setDefaultPartitions의 경우 requestorAddr 주소 형식이 올바른지 확인
      if (
        process.argv[3] === "setDefaultPartitions" &&
        web3.utils.isAddress(process.argv[4])
      ) {
        let requestorAddr = process.argv[4];

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

        // 숫자 인자가 필요한 항목이 숫자가 아닌 경우 확인
        if (isNaN(process.argv[5])) {
          handleError(1);
          return;
        }

        operationParamCnt = Number(process.argv[5]);

        if (process.argv[6] !== "-") {
          // 특정 함수의 인자 필요 개수만큼 돌며 params 배열 대입
          for (let i = 6; i < operationParamCnt + 6; i++) {
            partitions.push(web3.utils.toHex(process.argv[i]).padEnd(66, "0"));
          }
        }

        // 파티션이 하나도 없는 경우 에러 출력
        if (JSON.stringify(partitions) === "[]") {
          console.log("Error: At least one partition is required");
          return;
        }
      }

      if (
        ["getDefaultPartitions", "setDefaultPartitions"].includes(
          manageFunction
        )
      )
        return {
          contractAddr,
          manageFunction,
          partitions,
        };
      else handleError(2);
    } else handleError(3);
  } else handleError(4);
};

// defaultPartition 관리
const manageDefaultPartition = async (ca, code, params) => {
  // 관리자(서명자) 정보 추가
  web3.eth.accounts.wallet.add(signer);

  const contract = new web3.eth.Contract(ABI, ca);

  // 컨트랙트 전달 값 설정
  let deployTx = "";

  if (code === "getDefaultPartitions") {
    // 현재 기본 파티션 리스트 조회
    deployTx = contract.methods.getDefaultPartitions();
  } else if (code === "setDefaultPartitions") {
    // 기본 파티션에 특정 내용 적용
    deployTx = contract.methods.setDefaultPartitions(params);
  }

  // defaultPartition 관리 호출
  if (code === "getDefaultPartitions") {
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

const test = async () => {
  const parameterObject = await argumentCheck();

  if (parameterObject) {
    console.log(`Trying to call/send ${parameterObject.manageFunction}...`);

    await manageDefaultPartition(
      parameterObject.contractAddr,
      parameterObject.manageFunction,
      parameterObject.partitions
    );
  }
};

test();
