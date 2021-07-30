//! todo: upstream into a @darkforest npm package
const snarks = require("@darkforest_eth/snarks");
const hashing = require('@darkforest_eth/hashing');
const serde = require("@darkforest_eth/serde");
const snarkjs = require("snarkjs");

// export enum ZKArgIdx {
//     PROOF_A,
//     PROOF_B,
//     PROOF_C,
//     DATA,
//   }


// export const enum MoveArgIdxs {
//     FROM_ID,
//     TO_ID,
//     TO_PERLIN,
//     TO_RADIUS,
//     DIST_MAX,
//     PLANETHASH_KEY,
//     SPACETYPE_KEY,
//     PERLIN_LENGTH_SCALE,
//     PERLIN_MIRROR_X,
//     PERLIN_MIRROR_Y,
//     SHIPS_SENT,
//     SILVER_SENT,
//     ARTIFACT_SENT,
//   }


async function makeMoveArgs(CONSTANTS, SNARK_CONSTANTS, worldRadius, from, to, forces, silver, artifactMoved) {

    const oldX = from.coords.x;
    const oldY = from.coords.y;
    const newX = to.coords.x;
    const newY = to.coords.y;
    const xDiff = newX - oldX;
    const yDiff = newY - oldY;

    const distMax = Math.ceil(Math.sqrt(xDiff ** 2 + yDiff ** 2));

    return getMoveSnarkArgs(oldX, oldY, newX, newY, worldRadius, distMax, SNARK_CONSTANTS)
        .then((snarkArgs) => {

            let args = [
                snarkArgs[0], // snarkArgs[ZKArgIdx.PROOF_A]
                snarkArgs[1], // snarkArgs[ZKArgIdx.PROOF_B]
                snarkArgs[2], // snarkArgs[ZKArgIdx.PROOF_C]
                [
                    ...snarkArgs[3], // snarkArgs[ZKArgIdx.DATA]
                    (forces * CONSTANTS.CONTRACT_PRECISION).toString(),
                    (silver * CONSTANTS.CONTRACT_PRECISION).toString(),
                    '0',
                ],
            ];

            if (artifactMoved) {
                args[3][12] = serde.artifactIdToDecStr(artifactMoved); // args[ZKArgIdx.DATA][MoveArgIdxs.ARTIFACT_SENT]
            }

            return args;
        });
}


async function getMoveSnarkArgs(x1, y1, x2, y2, r, distMax, SNARK_CONSTANTS) {

    const input = {
        x1: hashing.modPBigInt(x1).toString(),
        y1: hashing.modPBigInt(y1).toString(),
        x2: hashing.modPBigInt(x2).toString(),
        y2: hashing.modPBigInt(y2).toString(),
        r: r.toString(),
        distMax: distMax.toString(),
        PLANETHASH_KEY: SNARK_CONSTANTS.PLANETHASH_KEY.toString(),
        SPACETYPE_KEY: SNARK_CONSTANTS.SPACETYPE_KEY.toString(),
        SCALE: SNARK_CONSTANTS.PERLIN_LENGTH_SCALE.toString(),
        xMirror: SNARK_CONSTANTS.PERLIN_MIRROR_X ? '1' : '0',
        yMirror: SNARK_CONSTANTS.PERLIN_MIRROR_Y ? '1' : '0',
    };

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        snarks.moveSnarkWasmPath,
        snarks.moveSnarkZkeyPath
    );
    // node process wont terminate because of held open workers
    await global.curve_bn128.terminate();

    return snarks.buildContractCallArgs(proof, publicSignals);
}


exports.getMoveSnarkArgs = getMoveSnarkArgs;
exports.makeMoveArgs = makeMoveArgs;