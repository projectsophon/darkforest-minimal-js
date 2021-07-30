const contracts = require('@darkforest_eth/contracts');
const typechain = require('@darkforest_eth/contracts/typechain');
const CONSTANTS = require('@darkforest_eth/constants');

const ethers = require('ethers');
const move = require('./move');

const RPC = "https://rpc.xdaichain.com/";

// replace with your FROM and TO planet data and burner secret (dont check in or share your burner secret!!)
const BURNER_SECRET = "your burner secret key that has been whitelisted";
const FROM = {
    hex: '0000059c0a3e70cb73b182d10552dc5c0733e8f4b2c4ccca7aa736efdf5a0ee8',
    coords: {
        x: 150811,
        y: 117652
    }
};
const TO = {
    hex: '000054871b8b2a6871542950bb026296ea375417b68b324ba865df438562b09b',
    coords: {
        x: 150829,
        y: 117613
    }
};


async function go() {

    let signer = new ethers.Wallet(BURNER_SECRET, new ethers.providers.JsonRpcProvider(RPC));
    const overrides = { gasPrice: ethers.utils.parseUnits('1', 'gwei'), gasLimit: 5000000 };

    // now we have a connected darkforest core contract
    let darkForestCore = typechain.DarkForestCore__factory.connect(contracts.CORE_CONTRACT_ADDRESS, signer);

    // live fully, purchase hats 
    // const hatReceipt = await darkForestCore.buyHat(ethers.BigNumber.from('0x' + FROM.hex), { value: ethers.utils.parseUnits('1', 'ether'), ...overrides });
    // await hatReceipt.wait();

    // we need to know the zksnark constants to do a move
    let SNARK_CONSTANTS = await darkForestCore.snarkConstants();

    // and the world radius
    const worldRadius = (await darkForestCore.worldRadius()).toNumber();

    // get the populationCap of planet from contract
    const fromPlanet = await darkForestCore.planets(ethers.BigNumber.from('0x' + FROM.hex));

    // send 20% of possible pop (assuming its has that much energy)
    const forces = (fromPlanet.populationCap.toNumber() * 0.2) / CONSTANTS.CONTRACT_PRECISION;
    const silver = 0;
    const moveArgs = await move.makeMoveArgs(CONSTANTS, SNARK_CONSTANTS, worldRadius, FROM, TO, forces, silver);
    let moveReceipt = await darkForestCore.move(...moveArgs, overrides);
    await moveReceipt.wait();
}

go().catch(console.log);
