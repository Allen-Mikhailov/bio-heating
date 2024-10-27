import { Link } from "react-router-dom"

function HomePage()
{
    return <div>
        <Link to={"/Prototype2"}>Prototype2</Link>
        <Link to={"/Prototype3"}>Prototype3</Link>
        <Link to={"/Prototype4"}>Prototype4</Link>
    </div>
}

export default HomePage