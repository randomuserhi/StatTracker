interface GearData
{
    name: string;
    damage: number;
    enemiesKilled: Record<string, number>;
}

interface AliveState
{
    timestamp: number;
    type: string;
    playerID?: number;
}

interface DodgeEvent
{
    timestamp: number;
    type: string;
    enemyInstanceID: string;
}

interface PackUse
{
    timestamp: number;
    type: string;
    playerID?: number;
}

interface DamageEvent
{
    timestamp: number;
    type: string;
    damage: number;

    enemyInstanceID?: string;
    
    playerID: number;
    gearName: string;
}

interface Player
{
    playerID: number;
    name: string;
    isBot: boolean;

    healthMax: number;
    
    packsUsed: PackUse[];
    dodges: DodgeEvent[];
    aliveStates: AliveState[];
    damageTaken: DamageEvent[];
    
    weapons: Record<string, GearData>;
    tools: Record<string, GearData>;
}

interface Report
{
    players: Player[];

}

interface ReportParser
{

}
interface ReportParserConstructor
{
    new(): ReportParser;
    prototype: ReportParser;
}

let ReportParser: ReportParserConstructor = function(type: "HOST", report: Report)
{

} as Function as ReportParserConstructor;