/**
 * Minter 관리를 위한 스크립트 파일
 * @brief isMinter, addMinter, removeMinter 함수 호출로 컨트랙트 상호 작용 가능
 * @command node ./test/task/manageMinter.js contractAddr manageFunction [함수별 파라미터]
 * @see 관련 문서: https://www.notion.so/noncelab/SC-deploy-a69c656cf24240fe84a42172e18afab4?pvs=4#e07ebeab6d3e431dbf1447b872489c49
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
    `유효하지 않은 인자 [${number}] (https://www.notion.so/noncelab/SC-deploy-a69c656cf24240fe84a42172e18afab4?pvs=4#e07ebeab6d3e431dbf1447b872489c49 참고)`
  );
};

// 인자 및 isMinter 사전 검증
const argumentCheck = async () => {
  // 필요한 인자가 모두 입력되었는지 확인
  if (
    process.argv.length > 4 &&
    process.argv.slice(2).every((arg) => arg && arg.length > 0)
  ) {
    // CA 주소 형식이 올바른지 / manageFunction 값이 아래 관리 코드 내에 포함되는지 확인
    if (
      !web3.utils.isAddress(process.argv[2]) ||
      !["isMinter", "addMinter", "removeMinter"].includes(process.argv[3])
    ) {
      handleError(1);
      return;
    }

    let contractAddr = web3.utils.toChecksumAddress(process.argv[2]);
    let manageFunction = process.argv[3];
    let targetMinterAddr;

    if (manageFunction === "isMinter" && web3.utils.isAddress(process.argv[4]))
      targetMinterAddr = web3.utils.toChecksumAddress(process.argv[4]);
    else {
      // requestorAddr가 addMinter 또는 removeMinter를 요청한 경우 minter인지 확인
      if (manageFunction === "addMinter" || manageFunction === "removeMinter") {
        // requestorAddr와 targetMinterAddr가 주소 형식인지 확인
        if (
          !web3.utils.isAddress(process.argv[4]) ||
          !web3.utils.isAddress(process.argv[5])
        ) {
          handleError(2);
          return;
        }

        // manageFunction이 removeMinter일 때 targetMinterAddr이 시스템 owner가 아닌지 확인
        if (
          manageFunction === "removeMinter" &&
          web3.utils.toChecksumAddress(process.argv[4]) ===
            web3.utils.toChecksumAddress(signer.address)
        ) {
          console.log("Error: 시스템 owner의 minter 권한을 제거할 수 없습니다");
          return;
        }

        // requestorAddr가 isMinter인지 확인
        // 관리자(서명자) 정보 추가
        web3.eth.accounts.wallet.add(signer);

        const contract = new web3.eth.Contract(ABI, process.argv[2]);
        const result = await contract.methods.isMinter(process.argv[4]).call();

        if (result)
          targetMinterAddr = web3.utils.toChecksumAddress(process.argv[5]);
        else {
          console.log("Error: requestorAddr는 minter가 아닙니다");
          return;
        }
      } else {
        handleError(3);
        return;
      }
    }

    return {
      contractAddr,
      manageFunction,
      targetMinterAddr,
    }
    // manageMinter(contractAddr, manageFunction, targetMinterAddr);
  } else handleError(4);
};

// minter 관리
const manageMinter = async (ca, code, eoa) => {
  // 관리자(서명자) 정보 추가
  web3.eth.accounts.wallet.add(signer);

  const contract = new web3.eth.Contract(ABI, ca);

  // 컨트랙트 전달 값 설정
  let tx = "";

  if (code === "isMinter") {
    // minter인지 확인
    tx = contract.methods.isMinter(eoa);
  } else if (code === "addMinter") {
    // 특정 주소 minter 권한 추가
    tx = contract.methods.addMinter(eoa);
  } else if (code === "removeMinter") {
    // 특정 주소 minter 권한 제거
    tx = contract.methods.removeMinter(eoa);
  }

  // minter 관리 호출
  if (code === "isMinter") {
    // 단순 조회
    const result = await tx.call();

    console.log(`Result: ${eoa} is${result ? '': ' NOT'} a minter.`);
  } else if(code === "addMinter" || code === "removeMinter"){
    // 트랜잭션 전송
    try{
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
        });
    } catch(e) {
      console.error(e.message);
      if(code === "addMinter") {
        console.log("Check if the address is already the minter.")
      } else if(code === "removeMinter") {
        console.log("Check if the address is not a minter.")
      }
    }
  }
};

const test = async () => {
  const parameterObject = await argumentCheck();
  console.log(`Trying call/send ${parameterObject.manageFunction} ${parameterObject.targetMinterAddr}...`)
  await manageMinter(parameterObject.contractAddr, 
    parameterObject.manageFunction, 
    parameterObject.targetMinterAddr
  );
}

test();