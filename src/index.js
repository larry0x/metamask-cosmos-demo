import { Registry } from "@cosmjs/proto-signing";
import { StargateClient, defaultRegistryTypes } from "@cosmjs/stargate";
import { Coin } from "cosmjs-types/cosmos/base/v1beta1/coin";
import { SignMode } from "cosmjs-types/cosmos/tx/signing/v1beta1/signing";
import { AuthInfo, SignDoc, SignerInfo } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { bech32 } from "bech32";
import { Tx } from "cosmjs-types/cosmos/tx/v1beta1/tx";

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

function decodeHex(hex) {
  if (hex.startsWith("0x")) {
    hex = hex.slice(2);
  }
  return Uint8Array.from(hex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
}

submitBtn.addEventListener("click", async function (event) {
  event.preventDefault();

  // interface registry - used to encode protobuf types
  const registry = new Registry(defaultRegistryTypes);

  // stargate client - used to broadcast transaction
  // const client = await StargateClient.connect(rpcEndpoint);

  const fromAddress = fromAddrInput.value;
  const fromAddrBytes = addressBytesFromBech32(fromAddress);

  const publicKey = {
    typeUrl: "/larry.abstractaccount.v1.NilPubKey",
    value: new Uint8Array([10, 32, ...fromAddrBytes]), // a little hack to encode the pk into proto bytes
  };

  const msg = {
    typeUrl: "/cosmos.bank.v1beta1.MsgSend",
    value: {
      fromAddress,
      toAddress: toAddrInput.value,
      amount: [
        Coin.fromPartial({
          denom: denomInput.value,
          amount: amountInput.value,
        }),
      ],
    }
  };

  const body = {
    typeUrl: "/cosmos.tx.v1beta1.TxBody",
    value: {
      messages: [msg],
    },
  };

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
      payer: "",
      granter: "",
    },
  });

  const signDoc = SignDoc.fromPartial({
    bodyBytes: registry.encode(body),
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

  const tx = Tx.fromPartial({
    body,
    authInfo,
    signatures: [decodeHex(sigHex)],
  });
});
