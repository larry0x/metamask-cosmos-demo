import { StargateClient } from "@cosmjs/stargate";
import { MsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx";
import { Coin } from "cosmjs-types/cosmos/base/v1beta1/coin";
import { SignMode } from "cosmjs-types/cosmos/tx/signing/v1beta1/signing";
import { AuthInfo, SignDoc, SignerInfo, Tx, TxBody } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { bech32 } from "bech32";
import Long from "long";

const fromAddrInput = document.getElementById("fromAddr");
const toAddrInput = document.getElementById("toAddr");
const denomInput = document.getElementById("denom");
const amountInput = document.getElementById("amount");
const chainIdInput = document.getElementById("chainId");
const sequenceInput = document.getElementById("sequence");
const accountNumberInput = document.getElementById("accountNumber");
const submitBtn = document.getElementById("submitBtn");

const rpcEndpoint = "http://127.0.0.1:26657";

function addressBytesFromBech32(str) {
  const { words } = bech32.decode(str);
  return bech32.fromWords(words);
}

function encodeHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function encodeJson(obj) {
  return new TextEncoder().encode(JSON.stringify(obj));
}

function decodeHex(hex) {
  if (hex.startsWith("0x")) {
    hex = hex.slice(2);
  }
  return Uint8Array.from(hex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
}

submitBtn.addEventListener("click", async function (event) {
  event.preventDefault();

  const fromAddress = fromAddrInput.value;
  const fromAddrBytes = addressBytesFromBech32(fromAddress);

  const publicKey = {
    typeUrl: "/larry.abstractaccount.v1.NilPubKey",
    value: new Uint8Array([10, 32, ...fromAddrBytes]), // a little hack to encode the pk into proto bytes
  };

  const msg = MsgSend.fromPartial({
    fromAddress,
    toAddress: toAddrInput.value,
    amount: [
      Coin.fromPartial({
        denom: denomInput.value,
        amount: amountInput.value,
      }),
    ],
  });

  const body = TxBody.fromPartial({
    messages: [
      {
        typeUrl: "/cosmos.bank.v1beta1.MsgSend",
        value: MsgSend.encode(msg).finish(),
      },
    ],
  });

  const authInfo = AuthInfo.fromPartial({
    signerInfos: [
      SignerInfo.fromPartial({
        publicKey,
        modeInfo: {
          single: {
            mode: SignMode.SIGN_MODE_DIRECT,
          },
        },
        sequence: sequenceInput.value,
      }),
    ],
    fee: {
      amount: [],
      gasLimit: 200000,
    },
  });

  const signDoc = SignDoc.fromPartial({
    bodyBytes: TxBody.encode(body).finish(),
    authInfoBytes: AuthInfo.encode(authInfo).finish(),
    chainId: chainIdInput.value,
    accountNumber: accountNumberInput.value,
  });

  const signBytes = SignDoc.encode(signDoc).finish();
  const signBytesHex = "0x" + encodeHex(signBytes);

  const accounts = await ethereum.request({
    method: 'eth_requestAccounts',
  });

  const sigHex = await ethereum.request({
    method: "personal_sign",
    params: [signBytesHex, accounts[0]],
  });

  const sigBytes = decodeHex(sigHex);
  const r = sigBytes.slice(0, 32);
  const s = sigBytes.slice(32, 64);
  const v = sigBytes[64];

  const cred = {
    r: Long.fromBytesBE(v, true).toString(),
    s: Long.fromBytesBE(s, true).toString(),
    v,
  };

  const tx = Tx.fromPartial({
    body,
    authInfo,
    signatures: [encodeJson(cred)],
  });

  const client = await StargateClient.connect(rpcEndpoint);

  try {
    const txhash = await client.broadcastTxSync(Tx.encode(tx).finish());
    console.log("tx broadcasted! txhash:", txhash);
  } catch (err) {
    console.log("tx failed!", err.toString());
  }
});
