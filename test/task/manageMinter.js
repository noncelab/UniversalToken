const Web3 = require("web3");
const ABI = require("../../build/contracts/ERC1400.json").abi;
require("dotenv").config();

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.RPC_URL));

const handleError = () => {
  console.log(
    "유효하지 않은 인자 (https://www.notion.so/noncelab/SC-deploy-a69c656cf24240fe84a42172e18afab4?pvs=4#e07ebeab6d3e431dbf1447b872489c49 참고)"
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
      handleError();
      return;
    }

    let contractAddr = process.argv[2];
    let manageFunction = process.argv[3];
    let targetMinterAddr;

    if (manageFunction === "isMinter" && web3.utils.isAddress(process.argv[4]))
      targetMinterAddr = process.argv[4];
    else {
      // requestorAddr가 addMinter 또는 removeMinter를 요청한 경우 minter인지 확인
      if (manageFunction === "addMinter" || manageFunction === "removeMinter") {
        // requestorAddr와 targetMinterAddr가 주소 형식인지 확인
        if (
          !web3.utils.isAddress(process.argv[4]) ||
          !web3.utils.isAddress(process.argv[5])
        ) {
          handleError();
          return;
        }

        // requestorAddr가 isMinter인지 확인
        const signer = web3.eth.accounts.privateKeyToAccount(
          "0x" + process.env.PRIVATE_KEY
        );

        // 관리자(서명자) 정보 추가
        web3.eth.accounts.wallet.add(signer);

        const contract = new web3.eth.Contract(ABI, process.argv[2]);
        const result = await contract.methods.isMinter(process.argv[4]).call();

        if (result) targetMinterAddr = process.argv[5];
        else {
          console.log("Error: requestorAddr는 isMinter가 아닙니다");
          return;
        }
      } else {
        handleError();
        return;
      }
    }

    manageMinter(contractAddr, manageFunction, targetMinterAddr);
  } else handleError();
};

// minter 관리
const manageMinter = async (ca, code, eoa) => {
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
