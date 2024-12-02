import { Link } from "react-router-dom"

function Prototypes()
{
    return <div>
        <div><Link to={"/"}>Home</Link></div>
        <div><Link to={"/prototype2"}>Prototype 2</Link></div>
        <div><Link to={"/prototype3"}>Prototype 3</Link></div>
        <div><Link to={"/prototype4"}>Prototype 4</Link></div>
        <div><Link to={"/prototype5"}>Prototype 5</Link></div>
        <div><Link to={"/prototype6"}>Prototype 6</Link></div>
    </div>
}

export default Prototypes