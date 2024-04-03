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
    `유효하지 않은 인자 [${number}] (https://www.notion.so/noncelab/SC-setDefaultPartitions-59806abe66164d9eac22ebf8db244f96?pvs=4#9c3e2beb9ee745b4a231425cb553d5e1 참고)`
  );
};

// 인자 및 owner 사전 검증
const argumentCheck = () => {
  // 필요한 인자가 모두 입력되었는지 확인
  if (
    process.argv.length > 3 &&
    process.argv.slice(2).every((arg) => arg && arg.length > 0)
  ) {
    let contractAddr = web3.utils.toChecksumAddress(process.argv[2]);
    let manageFunction = process.argv[3];
    let operationParamCnt = 0;
    let partitions = [];

    // setDefaultPartitions의 경우 requestorAddr 주소 형식이 올바른지 확인
    if (
      process.argv[3] === "setDefaultPartitions" &&
      web3.utils.isAddress(process.argv[4])
    ) {
      // TODO: requestorAddr가 실질적 컨트랙트 owner인지 확인

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
    }

    manageDefaultPartition(contractAddr, manageFunction, partitions);
  } else handleError(3);
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

argumentCheck();
