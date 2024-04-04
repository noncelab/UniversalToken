/**
 * Document 관리를 위한 스크립트 파일
 * @brief getDocument, setDocument, removeDocument, getAllDocuments 함수 호출로 컨트랙트 상호 작용 가능
 * @command node ./test/task/document.js contractAddr manageFunction [함수별 파라미터]
 * @see 관련 문서: https://www.notion.so/noncelab/SC-document-abe51223989d4631b60c3b0a785f5413?pvs=4#b6b1d8822f114100bcb286df59e1ffc2
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
    `유효하지 않은 인자 [${number}] (https://www.notion.so/noncelab/SC-document-abe51223989d4631b60c3b0a785f5413?pvs=4#b6b1d8822f114100bcb286df59e1ffc2 참고)`
  );
};

// 인자 및 isController 사전 검증
const argumentCheck = async () => {
  // 필요한 인자가 모두 입력되었는지 확인
  if (
    process.argv.length > 3 &&
    process.argv.slice(2).every((arg) => arg && arg.length > 0)
  ) {
    // CA 주소 형식이 올바른지 확인
    if (process.argv[2] && web3.utils.isAddress(process.argv[2])) {
      let contractAddr = web3.utils.toChecksumAddress(process.argv[2]);
      let manageFunction = process.argv[3];
      let params = [];

      if (manageFunction === "getDocument") {
        // 특정 이름의 문서 조회
        params.push(process.argv[4]);
      } else if (["setDocument", "removeDocument"].includes(manageFunction)) {
        // 특정 문서 등록/수정 또는 삭제 시 controller 여부 확인
        if (process.argv[4] && web3.utils.isAddress(process.argv[4])) {
          // 관리자(서명자) 정보 추가
          web3.eth.accounts.wallet.add(signer);

          const contract = new web3.eth.Contract(ABI, process.argv[2]);
          const result = await contract.methods.controllers().call();

          if (result.includes(web3.utils.toChecksumAddress(process.argv[4]))) {
            if (manageFunction === "setDocument") {
              // 특정 문서 등록/수정
              params.push(process.argv[5]);
              params.push(process.argv[6]);
              params.push(process.argv[7]);
            } else {
              // 특정 문서 삭제
              params.push(process.argv[5]);
            }
          } else {
            console.log(`Error: requestorAddr ${process.argv[4]}는 controller가 아닙니다`);
            return;
          }
        }
      } else if (manageFunction === "getAllDocuments") {
        // 모든 문서 조회
        // params 없음
      } else {
        handleError(1);
        return;
      }

      return {
        contractAddr, 
        manageFunction, 
        params
      } 
    } else handleError(2);
  } else handleError(3);
};

// document 관리
const manageDocument = async (ca, code, params) => {
  // 관리자(서명자) 정보 추가
  web3.eth.accounts.wallet.add(signer);

  const contract = new web3.eth.Contract(ABI, ca);

  // 컨트랙트 전달 값 설정
  let tx = "";

  if (code === "getDocument") {
    // 특정 이름의 문서 조회
    tx = contract.methods.getDocument(
      web3.utils.toHex(params[0]).padEnd(66, "0")
    );
  } else if (code === "setDocument") {
    // 특정 문서 등록/수정
    tx = contract.methods.setDocument(
      web3.utils.toHex(params[0]).padEnd(66, "0"),
      params[1],
      params[2]
    );
  } else if (code === "removeDocument") {
    // 특정 문서 삭제
    tx = contract.methods.removeDocument(
      web3.utils.toHex(params[0]).padEnd(66, "0")
    );
  } else if (code === "getAllDocuments") {
    // 모든 문서
    tx = contract.methods.getAllDocuments();
  }

  // document 관리 호출
  if (["getDocument", "getAllDocuments"].includes(code)) {
    // 단순 조회
    try {
      const result = await tx.call();

      if (result[2]) {
        console.log("[Result]");
        console.log("name:", params[0])
        console.log("uri:", result[0]);
        console.log("docHash:", result[1]);
        console.log(
          "timestamp:",
          result[2],
          "(",
          new Date(result[2] * 1000),
          ")"
        );
      } else {
        console.log("Result:", result);
      }
    } catch(e) {
      // 요청한 이름의 document struct가 없는 경우. Execution reverted
      console.log(e.message);
      if(code === "getDocument") { 
        console.log("Document does not exist.");
      }
    }
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
      });
  }
};

const test = async () => {
  const parameterObject = await argumentCheck();
  console.log(`Trying call/send ${parameterObject.manageFunction} ...`);
  manageDocument(parameterObject.contractAddr,
    parameterObject.manageFunction,
    parameterObject.params
  );
}

test();